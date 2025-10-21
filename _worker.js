// Cloudflare Pages _worker.js for Ido-Esperanto Translator
// Handles API routes and serves static assets from Pages ASSETS binding

export default {
  async fetch(request, env) {
    const url = new URL(request.url)
    const APY_SERVER_URL = (env.APY_SERVER_URL || 'http://ec2-52-211-137-158.eu-west-1.compute.amazonaws.com').replace(/\/$/, '')
    // Handle the case where Wrangler passes variables as string keys
    let VERSION = env.APP_VERSION || 'dev'
    if (!env.APP_VERSION) {
      // Look for any key that starts with "APP_VERSION="
      for (const key of Object.keys(env)) {
        if (key.startsWith('APP_VERSION=')) {
          VERSION = key.split('=')[1]
          break
        }
      }
    }
    const ADMIN_PASSWORD = env.ADMIN_PASSWORD || ''

    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    }

    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders })
    }

    const sendJson = (status, data) =>
      new Response(JSON.stringify(data), {
        status,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })

    // API: /api/*
    if (url.pathname.startsWith('/api/')) {
      const subpath = url.pathname.replace(/^\/api/, '') || '/'

      if (request.method === 'GET' && subpath === '/health') {
        return sendJson(200, { status: 'ok', version: VERSION, timestamp: new Date().toISOString() })
      }

      if (request.method === 'GET' && subpath === '/versions') {
        try {
          const repos = [
            { owner: 'komapc', repo: 'apertium-ido', label: 'ido' },
            { owner: 'apertium', repo: 'apertium-epo', label: 'epo' },
            { owner: 'komapc', repo: 'apertium-ido-epo', label: 'bilingual' },
          ]
          const ghHeaders = {
            'User-Agent': 'IdoEpoTranslator/1.0',
            'Accept': 'application/vnd.github+json',
            ...(env.GITHUB_TOKEN && { 'Authorization': `token ${env.GITHUB_TOKEN}` })
          }
          const results = await Promise.all(repos.map(async ({ owner, repo, label }) => {
            const base = `https://api.github.com/repos/${owner}/${repo}`
            // Try latest release first
            let version = null, date = null, commit = null
            let ok = false
            try {
              const rel = await fetch(`${base}/releases/latest`, { headers: ghHeaders })
              if (rel.ok) {
                const r = await rel.json()
                version = r.tag_name || r.name || null
                date = r.published_at || r.created_at || null
                ok = true
              }
            } catch {}
            if (!ok) {
              try {
                const commits = await fetch(`${base}/commits?per_page=1`, { headers: ghHeaders })
                if (commits.ok) {
                  const arr = await commits.json()
                  if (Array.isArray(arr) && arr.length) {
                    const c = arr[0]
                    commit = c.sha
                    date = c.commit?.committer?.date || c.commit?.author?.date || null
                  }
                }
              } catch {}
              // As a last resort, use default branch updated_at
              if (!date) {
                try {
                  const repoInfo = await fetch(base, { headers: ghHeaders })
                  if (repoInfo.ok) {
                    const info = await repoInfo.json()
                    date = info.updated_at || info.pushed_at || null
                  }
                } catch {}
              }
            }
            return { label, owner, repo, version, date, commit }
          }))
          return sendJson(200, { appVersion: VERSION, repos: results })
        } catch (e) {
          return sendJson(500, { error: 'Failed to fetch versions', details: e?.message })
        }
      }

      if (request.method === 'POST' && subpath === '/translate') {
        try {
          const contentType = request.headers.get('content-type') || ''
          let text, langpair

          if (contentType.includes('application/x-www-form-urlencoded')) {
            const formData = await request.formData()
            text = formData.get('q')
            langpair = formData.get('langpair')
          } else {
            const body = await request.json().catch(() => ({}))
            text = body?.text
            const direction = body?.direction
            langpair = direction === 'ido-epo' ? 'ido|epo' : 'epo|ido'
          }

          if (!text || !langpair) {
            return sendJson(400, { error: 'Missing text or langpair' })
          }

          const res = await fetch(`${APY_SERVER_URL}/translate`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({ q: text, langpair }),
          })

          if (!res.ok) {
            const errorText = await res.text().catch(() => 'No error body')
            return sendJson(502, {
              error: 'Translation service error',
              details: `APY server returned ${res.status}`,
              apyUrl: APY_SERVER_URL,
              errorBody: errorText,
            })
          }

          const data = await res.json()
          return sendJson(200, {
            translation: data.responseData?.translatedText || text,
            sourceLanguage: langpair.split('|')[0],
            targetLanguage: langpair.split('|')[1],
          })
        } catch (e) {
          return sendJson(500, { error: 'Translation service unavailable', details: e?.message })
        }
      }

      if (request.method === 'POST' && subpath === '/translate-url') {
        try {
          const body = await request.json().catch(() => ({}))
          const pageUrl = body?.url
          const direction = body?.direction
          if (!pageUrl || !direction) return sendJson(400, { error: 'Missing URL or direction' })

          // Be a good citizen: many sites require a UA; Wikipedia may 403 on missing UA
          const pageRes = await fetch(pageUrl, {
            headers: {
              'User-Agent': 'IdoEpoTranslator/1.0 (+workers.cloudflare.com)'
            }
          })
          if (!pageRes.ok) return sendJson(400, { error: 'Could not fetch URL', status: pageRes.status })
          const html = await pageRes.text()
          const textContent = extractTextFromHtml(html)
          if (!textContent.trim()) return sendJson(400, { error: 'No text content found in URL' })

          const langPair = direction === 'ido-epo' ? 'ido|epo' : 'epo|ido'

          // Chunk long texts to avoid APy limits and timeouts
          const chunks = chunkText(textContent, 1800) // safe margin under 2k
          const translatedParts = []
          for (const chunk of chunks) {
            const res = await fetch(`${APY_SERVER_URL}/translate`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
              body: new URLSearchParams({ q: chunk, langpair: langPair }),
            })
            if (!res.ok) return sendJson(502, { error: 'Translation service error (chunk)', status: res.status })
            const data = await res.json().catch(() => ({}))
            translatedParts.push(data.responseData?.translatedText ?? chunk)
          }

          return sendJson(200, {
            original: textContent.substring(0, 50000),
            translation: translatedParts.join(' '),
            url: pageUrl,
            chunks: chunks.length,
          })
        } catch (e) {
          return sendJson(500, { error: 'URL translation failed', details: e?.message })
        }
      }

      if (request.method === 'POST' && subpath === '/admin/rebuild') {
        try {
          if (!env.REBUILD_WEBHOOK_URL) {
            return sendJson(500, { error: 'Rebuild webhook URL not configured' })
          }
          const webhookRes = await fetch(env.REBUILD_WEBHOOK_URL, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'X-Rebuild-Token': env.REBUILD_SHARED_SECRET || '',
            },
            body: JSON.stringify({ trigger: 'web-ui' }),
          })
          const text = await webhookRes.text().catch(() => '')
          if (!webhookRes.ok) {
            return sendJson(502, {
              error: 'Failed to trigger EC2 rebuild',
              details: `Webhook returned ${webhookRes.status}`,
              webhookUrl: env.REBUILD_WEBHOOK_URL,
              body: text?.slice(0, 2000),
            })
          }
          // Try parse JSON, else wrap as text
          let body
          try { body = JSON.parse(text) } catch { body = { status: 'ok', log: text?.slice(0, 5000) } }
          return sendJson(202, { status: 'accepted', ...body })
        } catch (e) {
          return sendJson(500, { error: 'Rebuild trigger failed', details: e?.message })
        }
      }

      return sendJson(404, { error: 'API endpoint not found' })
    }

    // Static assets via ASSETS binding; fallback to index.html for SPA routing
    try {
      const asset = await env.ASSETS.fetch(request)
      return asset
    } catch (_) {
      try {
        const indexRequest = new Request(new URL('/index.html', request.url), request)
        return await env.ASSETS.fetch(indexRequest)
      } catch {
        return new Response('404 Not Found', { status: 404 })
      }
    }
  },
}

function extractTextFromHtml(html) {
  return html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, ' ')
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .substring(0, 5000)
}

function chunkText(text, size) {
  const out = []
  for (let i = 0; i < text.length; i += size) out.push(text.slice(i, i + size))
  return out
}


