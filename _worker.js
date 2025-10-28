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

      if (request.method === 'GET' && subpath === '/status') {
        try {
          if (!env.REBUILD_WEBHOOK_URL) {
            return sendJson(500, { error: 'Webhook URL not configured' })
          }

          const statusUrl = env.REBUILD_WEBHOOK_URL.replace('/rebuild', '/status')
          const statusRes = await fetch(statusUrl, {
            headers: {
              'X-Rebuild-Token': env.REBUILD_SHARED_SECRET || '',
            },
            signal: AbortSignal.timeout(5000) // 5 second timeout
          })

          if (!statusRes.ok) {
            return sendJson(502, {
              error: 'Failed to fetch EC2 status',
              details: `Status endpoint returned ${statusRes.status}`
            })
          }

          const data = await statusRes.json()
          return sendJson(200, data)
        } catch (e) {
          return sendJson(500, { error: 'Status check failed', details: e?.message })
        }
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

          // Fetch EC2 status in parallel with GitHub data
          let ec2Status = null
          try {
            if (env.REBUILD_WEBHOOK_URL) {
              const statusUrl = env.REBUILD_WEBHOOK_URL.replace('/rebuild', '/status')
              const statusRes = await fetch(statusUrl, {
                headers: {
                  'X-Rebuild-Token': env.REBUILD_SHARED_SECRET || '',
                },
                signal: AbortSignal.timeout(5000) // 5 second timeout
              })
              if (statusRes.ok) {
                ec2Status = await statusRes.json()
              }
            }
          } catch (e) {
            // EC2 status fetch failed, continue without it
            console.error('Failed to fetch EC2 status:', e.message)
          }

          const results = await Promise.all(repos.map(async ({ owner, repo, label }) => {
            const base = `https://api.github.com/repos/${owner}/${repo}`
            // Try latest release first
            let version = null, buildDate = null, lastCommitDate = null, latestHash = null
            let ok = false
            try {
              const rel = await fetch(`${base}/releases/latest`, { headers: ghHeaders })
              if (rel.ok) {
                const r = await rel.json()
                version = r.tag_name || r.name || null
                buildDate = r.published_at || r.created_at || null
                ok = true
              }
            } catch { }

            // Always get latest commit info
            try {
              const commits = await fetch(`${base}/commits?per_page=1`, { headers: ghHeaders })
              if (commits.ok) {
                const arr = await commits.json()
                if (Array.isArray(arr) && arr.length) {
                  const c = arr[0]
                  latestHash = c.sha
                  lastCommitDate = c.commit?.committer?.date || c.commit?.author?.date || null
                }
              }
            } catch { }

            // As a last resort for date, use default branch updated_at
            if (!lastCommitDate && !buildDate) {
              try {
                const repoInfo = await fetch(base, { headers: ghHeaders })
                if (repoInfo.ok) {
                  const info = await repoInfo.json()
                  lastCommitDate = info.updated_at || info.pushed_at || null
                }
              } catch { }
            }

            // Get EC2 deployed status for this repo
            let currentHash = null
            let commitDate = null
            let commitMessage = null
            if (ec2Status?.repositories) {
              const ec2Repo = ec2Status.repositories.find(r => r.repo === label)
              if (ec2Repo) {
                currentHash = ec2Repo.currentHash
                commitDate = ec2Repo.commitDate
                commitMessage = ec2Repo.commitMessage
              }
            }

            // Determine if pull/build is needed
            const needsPull = latestHash && currentHash && latestHash !== currentHash
            const needsBuild = needsPull // If pulled, needs rebuild
            const isUpToDate = latestHash && currentHash && latestHash === currentHash

            return {
              label,
              owner,
              repo,
              version,
              buildDate,
              lastCommitDate,
              latestHash,
              currentHash,
              commitDate,
              commitMessage,
              lastBuiltHash: currentHash, // Same as current for now
              needsPull,
              needsBuild,
              isUpToDate,
              githubUrl: `https://github.com/${owner}/${repo}`
            }
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



      if (request.method === 'POST' && subpath === '/admin/pull-repo') {
        try {
          if (!env.REBUILD_WEBHOOK_URL) {
            return sendJson(500, { error: 'Rebuild webhook URL not configured' })
          }

          const body = await request.json().catch(() => ({}))
          const repo = body?.repo
          if (!repo || !['ido', 'epo', 'bilingual'].includes(repo)) {
            return sendJson(400, { error: 'Invalid repo parameter. Must be: ido, epo, or bilingual' })
          }

          const webhookRes = await fetch(env.REBUILD_WEBHOOK_URL.replace('/rebuild', '/pull-repo'), {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'X-Rebuild-Token': env.REBUILD_SHARED_SECRET || '',
            },
            body: JSON.stringify({ repo, trigger: 'web-ui' }),
          })
          const text = await webhookRes.text().catch(() => '')
          if (!webhookRes.ok) {
            return sendJson(502, {
              error: 'Failed to trigger repository pull',
              details: `Webhook returned ${webhookRes.status}`,
              webhookUrl: env.REBUILD_WEBHOOK_URL,
              body: text?.slice(0, 2000),
            })
          }
          // Try parse JSON, else wrap as text
          let responseBody
          try { responseBody = JSON.parse(text) } catch { responseBody = { status: 'ok', log: text?.slice(0, 5000) } }
          return sendJson(200, { status: 'success', repo, ...responseBody })
        } catch (e) {
          return sendJson(500, { error: 'Pull trigger failed', details: e?.message })
        }
      }

      if (request.method === 'POST' && subpath === '/admin/build-repo') {
        try {
          if (!env.REBUILD_WEBHOOK_URL) {
            return sendJson(500, { error: 'Rebuild webhook URL not configured' })
          }

          const body = await request.json().catch(() => ({}))
          const repo = body?.repo
          if (!repo || !['ido', 'epo', 'bilingual'].includes(repo)) {
            return sendJson(400, { error: 'Invalid repo parameter. Must be: ido, epo, or bilingual' })
          }

          const webhookRes = await fetch(env.REBUILD_WEBHOOK_URL.replace('/rebuild', '/build-repo'), {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'X-Rebuild-Token': env.REBUILD_SHARED_SECRET || '',
            },
            body: JSON.stringify({ repo, trigger: 'web-ui' }),
          })
          const text = await webhookRes.text().catch(() => '')
          if (!webhookRes.ok) {
            return sendJson(502, {
              error: 'Failed to trigger repository build',
              details: `Webhook returned ${webhookRes.status}`,
              webhookUrl: env.REBUILD_WEBHOOK_URL,
              body: text?.slice(0, 2000),
            })
          }
          // Try parse JSON, else wrap as text
          let responseBody
          try { responseBody = JSON.parse(text) } catch { responseBody = { status: 'ok', log: text?.slice(0, 5000) } }
          return sendJson(202, { status: 'accepted', repo, message: 'Build started successfully', ...responseBody })
        } catch (e) {
          return sendJson(500, { error: 'Build trigger failed', details: e?.message })
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




