// create/update version.json and .env.local with an auto-incrementing build id
// Rule: bump patch if VERSION_BUMP=patch, otherwise keep package.json version and append build count
// This keeps production version = package.json version; but exposes build id in dev as vX.Y.Z+buildN

const fs = require('fs')
const path = require('path')

const root = process.cwd()
const pkgPath = path.join(root, 'package.json')
const versionStatePath = path.join(root, 'version.json')
const envLocalPath = path.join(root, '.env.local')

const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'))
let version = pkg.version || '0.0.0'

let state = { build: 0, lastVersion: version }
if (fs.existsSync(versionStatePath)) {
  try {
    state = JSON.parse(fs.readFileSync(versionStatePath, 'utf8'))
  } catch {}
}

if (process.env.VERSION_BUMP === 'patch') {
  const parts = version.split('.')
  parts[2] = String(Number(parts[2] || '0') + 1)
  version = parts.join('.')
  pkg.version = version
  fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n')
  state.build = 0
  state.lastVersion = version
} else {
  if (state.lastVersion === version) {
    state.build = (state.build || 0) + 1
  } else {
    state.build = 1
    state.lastVersion = version
  }
}

fs.writeFileSync(versionStatePath, JSON.stringify(state, null, 2) + '\n')

// For dev: write .env.local for vite
const devVersion = `${version}+build.${state.build}`
try {
  const line = `VITE_APP_VERSION=${devVersion}\n`
  fs.writeFileSync(envLocalPath, line)
} catch {}

console.log(`Using version: ${version} (build ${state.build})`)
