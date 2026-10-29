const fs = require('fs');
const path = require('path');

const DOMAIN = 'https://tradukilo.lipu.dev';
const publicDir = __dirname;

console.log('--- Generating Sitemap for Translator ---');

// The home page and the static /about-{io,en,eo}, /ido-epo, /epo-ido pages are listed. The ?q=<word> result pages are noindex'd in
// _worker.js: they are thin single-word duplicates of the vortaro dictionary
// pages, Bing dropped them from its index (150 -> 2 pages), and ?q= accepts
// arbitrary text, so listing/indexing them invites index bloat and reflected
// content.
// lastmod = date of the last commit touching the files that make up each page.
// In a shallow clone (CI's default checkout) git only knows the tip commit, so
// every page would get the same date; omit lastmod then rather than lie.
const { execFileSync } = require('child_process');
const repoRoot = path.join(__dirname, '..');
const git = (args) => execFileSync('git', args, { cwd: repoRoot, encoding: 'utf8' }).trim();
let useGit = false;
try { useGit = git(['rev-parse', '--is-shallow-repository']) === 'false'; } catch (_) { /* not a git checkout */ }
const lastmod = (files) => {
  if (!useGit) return '';
  const d = git(['log', '-1', '--format=%cs', '--', ...files]);
  return d ? `\n    <lastmod>${d}</lastmod>` : '';
};

const pages = [
  { loc: '/', files: ['index.html', 'src'] },
  ...['about-io', 'about-en', 'about-eo', 'ido-epo', 'epo-ido'].map(l => ({ loc: `/${l}`, files: [`public/${l}.html`] })),
];
const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${pages.map(p => `  <url>
    <loc>${DOMAIN}${p.loc}</loc>${lastmod(p.files)}
  </url>`).join('\n')}
</urlset>
`;

// Write to public/ (source) and dist/ (already copied by Vite before this
// postbuild step runs, so dist would otherwise ship the previous build's file).
fs.writeFileSync(path.join(publicDir, 'sitemap.xml'), sitemap);
const distDir = path.join(__dirname, '../dist');
if (fs.existsSync(distDir)) fs.writeFileSync(path.join(distDir, 'sitemap.xml'), sitemap);
console.log(`✅ Sitemap generated (${pages.length} URLs${useGit ? '' : ', no lastmod: shallow or no git'}).`);
