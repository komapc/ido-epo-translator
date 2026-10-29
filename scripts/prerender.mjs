// Prerender the React app into dist/index.html at build time.
// Runs from `postbuild`, after `vite build` has written dist/. Builds an SSR
// bundle of src/entry-server.tsx into dist-ssr/, renders <App /> to a string
// and swaps it in for the <!--app-html--> marker inside #root.
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { build } from 'vite'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const ssrDir = path.join(root, 'dist-ssr')
const indexPath = path.join(root, 'dist', 'index.html')
const MARKER = '<!--app-html-->'
const DONE = '<!--prerendered-->'

// `npm run build` triggers postbuild twice (npm's post-hook plus the explicit
// call that build:pages also relies on); the second run has nothing to do.
if (fs.readFileSync(indexPath, 'utf8').includes(DONE)) {
  console.log('prerender: dist/index.html already prerendered, skipping')
  process.exit(0)
}

// The client build gets VITE_APP_VERSION from the npm script; mirror it so the
// prerendered footer shows the same version.
process.env.VITE_APP_VERSION ||= process.env.npm_package_version || ''

await build({
  root,
  logLevel: 'warn',
  build: { ssr: 'src/entry-server.tsx', outDir: ssrDir, emptyOutDir: true },
})

const { render } = await import(pathToFileURL(path.join(ssrDir, 'entry-server.js')).href)
const html = fs.readFileSync(indexPath, 'utf8')
if (!html.includes(MARKER)) {
  console.error(`prerender: ${MARKER} not found in dist/index.html`)
  process.exit(1)
}
fs.writeFileSync(indexPath, html.replace(MARKER, render() + DONE))
fs.rmSync(ssrDir, { recursive: true, force: true })
console.log('✅ Prerendered app into dist/index.html')
