// Tests for _worker.js (Cloudflare Pages advanced mode). The worker is called directly with a
// fake env: ASSETS serves the real index.html, and global fetch (APy, the rebuild webhook, the
// neural service) is a mock, so nothing leaves the test.
import { readFileSync } from 'node:fs'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import worker from '../_worker.js'

const SITE = 'https://tradukilo.lipu.dev'
const INDEX_HTML = readFileSync(new URL('../index.html', import.meta.url), 'utf8')

/** ASSETS binding: / and /index.html are index.html, `files` adds other paths, the rest is 404. */
function assets(files = {}) {
  return {
    fetch: vi.fn(async (req) => {
      const path = new URL(req.url).pathname
      if (path === '/' || path === '/index.html') {
        return new Response(INDEX_HTML, { headers: { 'content-type': 'text/html; charset=utf-8' } })
      }
      if (path in files) return new Response(files[path], { headers: { 'content-type': 'text/html' } })
      return new Response('', { status: 404 })
    }),
  }
}

let upstream // global fetch mock
beforeEach(() => {
  upstream = vi.fn(async () => Response.json({}))
  vi.stubGlobal('fetch', upstream)
  vi.spyOn(console, 'error').mockImplementation(() => {})
})
afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

const call = (path, init = {}, env = {}) =>
  worker.fetch(new Request(SITE + path, init), { ASSETS: assets(), ...env })
const count = (html, re) => (html.match(re) || []).length

describe('hosts and fixed paths', () => {
  it('301s the old pages.dev host to the same path and query on tradukilo.lipu.dev', async () => {
    const res = await worker.fetch(new Request('https://ido-tradukilo.pages.dev/about-en?x=1'), {})
    expect(res.status).toBe(301)
    expect(res.headers.get('location')).toBe(`${SITE}/about-en?x=1`)
  })

  it('serves the Yandex verification file with 200', async () => {
    const res = await call('/yandex_fe73d9bf92172294.html')
    expect(res.status).toBe(200)
    expect(await res.text()).toContain('Verification: fe73d9bf92172294')
  })

  it('answers OPTIONS with CORS headers', async () => {
    const res = await call('/api/translate', { method: 'OPTIONS' })
    expect(res.headers.get('access-control-allow-origin')).toBe('*')
    expect(res.headers.get('access-control-allow-methods')).toContain('POST')
  })

  it('unknown /api/ paths are a JSON 404', async () => {
    const res = await call('/api/nope')
    expect(res.status).toBe(404)
    expect(await res.json()).toEqual({ error: 'API endpoint not found' })
  })
})

describe('/api/health', () => {
  it('reports APP_VERSION, also when Wrangler passes it as an "APP_VERSION=x" key', async () => {
    expect((await (await call('/api/health', {}, { APP_VERSION: '1.2.3' })).json()).version).toBe('1.2.3')
    expect((await (await call('/api/health', {}, { 'APP_VERSION=9.9.9': '' })).json()).version).toBe('9.9.9')
    expect((await (await call('/api/health')).json()).version).toBe('dev')
  })
})

describe('/api/translate (Apertium via APy)', () => {
  const post = (body, headers = { 'content-type': 'application/json' }) =>
    call('/api/translate', { method: 'POST', headers, body })

  it('sends JSON {text, direction} to APy as a form and returns the translation', async () => {
    upstream.mockResolvedValueOnce(Response.json({ responseData: { translatedText: 'la hundo' } }))
    const res = await post(JSON.stringify({ text: 'la hundo', direction: 'ido-epo' }))
    expect(await res.json()).toEqual({ translation: 'la hundo', sourceLanguage: 'ido', targetLanguage: 'epo' })
    const [url, init] = upstream.mock.calls[0]
    expect(url).toBe('https://apy.lipu.dev/translate')
    expect(Object.fromEntries(new URLSearchParams(String(init.body)))).toEqual({ q: 'la hundo', langpair: 'ido|epo' })
  })

  it('maps any other direction to epo|ido and honours APY_SERVER_URL', async () => {
    upstream.mockResolvedValueOnce(Response.json({ responseData: { translatedText: 'x' } }))
    await call('/api/translate', { method: 'POST', body: JSON.stringify({ text: 'x', direction: 'epo-ido' }) },
      { APY_SERVER_URL: 'https://apy.test/' })
    const [url, init] = upstream.mock.calls[0]
    expect(url).toBe('https://apy.test/translate')
    expect(new URLSearchParams(String(init.body)).get('langpair')).toBe('epo|ido')
  })

  it('accepts the APy-style form body (q, langpair)', async () => {
    upstream.mockResolvedValueOnce(Response.json({ responseData: { translatedText: 'saluton' } }))
    const res = await post(new URLSearchParams({ q: 'saluto', langpair: 'ido|epo' }),
      { 'content-type': 'application/x-www-form-urlencoded' })
    expect((await res.json()).translation).toBe('saluton')
  })

  it('rejects missing text (400) and text over 8000 characters (413) without calling APy', async () => {
    expect((await post(JSON.stringify({ direction: 'ido-epo' }))).status).toBe(400)
    expect((await post(JSON.stringify({ text: 'a'.repeat(8001), direction: 'ido-epo' }))).status).toBe(413)
    expect((await post(JSON.stringify({ text: 'a'.repeat(8000), direction: 'ido-epo' }))).status).toBe(200)
    expect(upstream).toHaveBeenCalledTimes(1)
  })

  it('an APy error is a generic 502: the upstream text stays in the log', async () => {
    upstream.mockResolvedValueOnce(new Response('Traceback /opt/apertium secret', { status: 500 }))
    const res = await post(JSON.stringify({ text: 'x', direction: 'ido-epo' }))
    expect(res.status).toBe(502)
    expect(await res.text()).not.toContain('/opt/apertium')
  })

  it('APy unreachable is a 500', async () => {
    upstream.mockRejectedValueOnce(new TypeError('fetch failed'))
    expect((await post(JSON.stringify({ text: 'x', direction: 'ido-epo' }))).status).toBe(500)
  })
})

describe('admin endpoints', () => {
  const ADMIN = { ADMIN_PASSWORD: 'pw', REBUILD_WEBHOOK_URL: 'https://hook.test/rebuild', REBUILD_SHARED_SECRET: 'shh' }
  const admin = (path, { token, method = 'POST', body, env = ADMIN } = {}) =>
    call(`/api/admin/${path}`, {
      method,
      headers: token === undefined ? {} : { Authorization: `Bearer ${token}` },
      ...(body && { body: JSON.stringify(body) }),
    }, env)

  it('are disabled (503) when ADMIN_PASSWORD is not set', async () => {
    const res = await admin('rebuild', { token: '', env: { REBUILD_WEBHOOK_URL: 'https://hook.test/rebuild' } })
    expect(res.status).toBe(503)
    expect(upstream).not.toHaveBeenCalled()
  })

  it('need the right bearer token (401) and never reach the webhook without it', async () => {
    for (const token of [undefined, '', 'wrong', 'PW', 'pwpw']) {
      expect((await admin('rebuild', { token })).status, String(token)).toBe(401)
    }
    // The password without the Bearer scheme is not accepted either.
    const raw = await call('/api/admin/rebuild', { method: 'POST', headers: { Authorization: 'pw' } }, ADMIN)
    expect(raw.status).toBe(401)
    expect((await admin('operation', { method: 'GET', token: 'nope' })).status).toBe(401)
    expect(upstream).not.toHaveBeenCalled()
  })

  it('rebuild: forwards to the webhook with the shared secret and answers 202', async () => {
    upstream.mockResolvedValueOnce(new Response('{"started":true}'))
    const res = await admin('rebuild', { token: 'pw' })
    expect(res.status).toBe(202)
    expect(await res.json()).toEqual({ status: 'accepted', started: true })
    const [url, init] = upstream.mock.calls[0]
    expect(url).toBe('https://hook.test/rebuild')
    expect(init.headers['X-Rebuild-Token']).toBe('shh')
  })

  it('a busy webhook is 409; a failing one is 502 without its text', async () => {
    upstream.mockResolvedValueOnce(new Response('busy', { status: 409 }))
    expect((await admin('rebuild', { token: 'pw' })).status).toBe(409)
    upstream.mockResolvedValueOnce(new Response('stack trace /home/ubuntu', { status: 500 }))
    const res = await admin('rebuild', { token: 'pw' })
    expect(res.status).toBe(502)
    expect(await res.text()).not.toContain('/home/ubuntu')
  })

  it('build-repo validates the repo and turns "No space left on device" into a fixed hint', async () => {
    expect((await admin('build-repo', { token: 'pw', body: { repo: '../etc' } })).status).toBe(400)
    expect(upstream).not.toHaveBeenCalled()
    upstream.mockResolvedValueOnce(new Response('cp: No space left on device', { status: 500 }))
    const res = await admin('build-repo', { token: 'pw', body: { repo: 'ido' } })
    expect(res.status).toBe(502)
    const data = await res.json()
    expect(data.hint).toMatch(/out of disk space/)
    expect(JSON.stringify(data)).not.toContain('cp:')
    expect(upstream.mock.calls[0][0]).toBe('https://hook.test/build-repo')
  })

  it('pull-repo validates the repo', async () => {
    expect((await admin('pull-repo', { token: 'pw', body: { repo: 'x' } })).status).toBe(400)
    upstream.mockResolvedValueOnce(new Response('{"pulled":true}'))
    const res = await admin('pull-repo', { token: 'pw', body: { repo: 'epo' } })
    expect(await res.json()).toEqual({ status: 'success', repo: 'epo', pulled: true })
  })

  it('operation reads the webhook /operation endpoint', async () => {
    upstream.mockResolvedValueOnce(Response.json({ operation: { state: 'running' } }))
    const res = await admin('operation', { method: 'GET', token: 'pw' })
    expect(await res.json()).toEqual({ operation: { state: 'running' } })
    expect(upstream.mock.calls[0][0]).toBe('https://hook.test/operation')
  })
})

describe('/api/neural/* (server-side NLLB)', () => {
  const NEURAL = { NEURAL_KEY: 'k', NEURAL_URL: 'https://neural.test/' }
  const translate = (headers, body = '{"text":"x"}', env = NEURAL) =>
    call('/api/neural/translate', { method: 'POST', headers, body }, env)

  it('is unavailable (503) without NEURAL_KEY', async () => {
    expect((await translate({ Origin: SITE }, '{}', {})).status).toBe(503)
  })

  it('forbids (403) a POST without a same-host Origin', async () => {
    for (const origin of [undefined, 'https://evil.test', 'null', 'not a url', 'https://tradukilo.lipu.dev.evil.test']) {
      const res = await translate(origin === undefined ? {} : { Origin: origin })
      expect(res.status, String(origin)).toBe(403)
    }
    expect(upstream).not.toHaveBeenCalled()
  })

  it('forwards a same-origin POST with the key and passes the answer and status through', async () => {
    upstream.mockResolvedValueOnce(Response.json({ error: 'Busy' }, { status: 429 }))
    const res = await translate({ Origin: SITE }, '{"text":"hundo"}')
    expect(res.status).toBe(429)
    expect(await res.json()).toEqual({ error: 'Busy' })
    const [url, init] = upstream.mock.calls[0]
    expect(url).toBe('https://neural.test/translate')
    expect(init.headers['x-neural-key']).toBe('k')
    expect(init.body).toBe('{"text":"hundo"}')
  })

  it('rejects a body over 8000 characters (413) and a GET translate (405)', async () => {
    expect((await translate({ Origin: SITE }, 'a'.repeat(8001))).status).toBe(413)
    expect((await call('/api/neural/translate', { headers: { Origin: SITE } }, NEURAL)).status).toBe(405)
    expect(upstream).not.toHaveBeenCalled()
  })

  it('a non-JSON answer (Cloud Run itself) becomes a JSON error; a network error is 502', async () => {
    upstream.mockResolvedValueOnce(new Response('<html>Service Unavailable</html>', { status: 503 }))
    const res = await translate({ Origin: SITE })
    expect(res.status).toBe(503)
    expect(await res.json()).toEqual({ error: 'Server translation failed' })
    upstream.mockRejectedValueOnce(new TypeError('fetch failed'))
    expect((await translate({ Origin: SITE })).status).toBe(502)
  })

  it('health allows a same-origin GET without Origin and maps the service state to 200/503', async () => {
    upstream.mockResolvedValueOnce(new Response('ok'))
    const up = await call('/api/neural/health', {}, NEURAL)
    expect(up.status).toBe(200)
    expect(await up.json()).toEqual({ ok: true })
    upstream.mockResolvedValueOnce(new Response('', { status: 500 }))
    expect((await call('/api/neural/health', {}, NEURAL)).status).toBe(503)
    expect((await call('/api/neural/health', { headers: { Origin: 'https://evil.test' } }, NEURAL)).status).toBe(403)
  })
})

describe('?q= share pages', () => {
  const apy = (translatedText) =>
    upstream.mockResolvedValueOnce(Response.json({ responseData: { translatedText } }))
  const page = async (query) => {
    const res = await call(`/?${new URLSearchParams(query)}`)
    return { res, html: await res.text() }
  }

  it('replace the static head tags in place (one of each) and are noindex with a canonical to /', async () => {
    apy('la hundo')
    const { res, html } = await page({ q: 'la hundo' })
    expect(res.status).toBe(200)
    expect(upstream.mock.calls[0][0]).toBe('https://apy.lipu.dev/translate?langpair=ido%7Cepo&q=la%20hundo')
    for (const re of [/<title>/g, /rel="canonical"/g, /name="description"/g, /property="og:title"/g,
      /property="og:description"/g, /name="twitter:title"/g, /name="twitter:description"/g]) {
      expect(count(html, re), String(re)).toBe(1)
    }
    expect(html).toContain('<title>la hundo → la hundo — Ido-Esperanto Translation</title>')
    expect(html).toContain(`<link rel="canonical" href="${SITE}/">`)
    expect(html).toContain('<meta name="robots" content="noindex,follow">')
    expect(html).toContain('<noscript><div id="ssr-translation"><h2>la hundo → la hundo</h2>')
    expect(html).toContain('"@type":"BreadcrumbList"')
  })

  it('dir=epo-ido swaps the languages', async () => {
    apy('hundo')
    const { html } = await page({ q: 'hundo', dir: 'epo-ido' })
    expect(upstream.mock.calls[0][0]).toContain('langpair=epo%7Cido')
    expect(html).toContain('— Esperanto-Ido Translation</title>')
  })

  it('escape the query and the translation', async () => {
    apy('<img src=x onerror=alert(2)>')
    const { html } = await page({ q: '"><script>alert(1)</script>' })
    expect(html).not.toContain('<script>alert(1)')
    expect(html).not.toContain('<img src=x')
    expect(html).toContain('&quot;&gt;&lt;script&gt;alert(1)&lt;/script&gt;')
  })

  it('treat $& and $` in the query as text, not replacement patterns', async () => {
    apy('x')
    const { html } = await page({ q: '$&$`' })
    expect(html).toContain('<title>$&amp;$` → x')
    expect(html.length).toBeLessThan(INDEX_HTML.length + 3000)
  })

  it('cut the query to 200 characters', async () => {
    apy('')
    const { html } = await page({ q: 'a'.repeat(500) })
    expect(html).toContain(`<title>${'a'.repeat(200)} - Ido to Esperanto Translation</title>`)
  })

  it('fall back to meta tags only (still noindex) when APy fails', async () => {
    upstream.mockRejectedValueOnce(new TypeError('fetch failed'))
    const { res, html } = await page({ q: 'hundo' })
    expect(res.status).toBe(200)
    expect(html).toContain('<title>hundo - Ido to Esperanto Translation</title>')
    expect(html).toContain('noindex,follow')
    expect(html).not.toContain('ssr-translation')
  })
})

describe('static pages', () => {
  it('pass through untouched without ?q=', async () => {
    const res = await call('/')
    expect(await res.text()).toBe(INDEX_HTML)
    expect(upstream).not.toHaveBeenCalled()
  })

  it('an unknown path is a real 404 with the 404 page body', async () => {
    const res = await worker.fetch(new Request(`${SITE}/no-such-page`), { ASSETS: assets({ '/404': 'Not found page' }) })
    expect(res.status).toBe(404)
    expect(await res.text()).toBe('Not found page')
  })

  it('falls back to index.html when the asset server throws', async () => {
    const ASSETS = { fetch: vi.fn().mockRejectedValueOnce(new Error('boom')).mockResolvedValueOnce(new Response('index')) }
    const res = await worker.fetch(new Request(`${SITE}/x`), { ASSETS })
    expect(await res.text()).toBe('index')
    expect(new URL(ASSETS.fetch.mock.calls[1][0].url).pathname).toBe('/index.html')
  })
})
