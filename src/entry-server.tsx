import React from 'react'
import { renderToString } from 'react-dom/server'
import App from './App.tsx'

// Build-time prerender (scripts/prerender.mjs): the app's initial HTML is
// written into dist/index.html so crawlers get the real heading, explanation
// and examples without running JS. main.tsx still uses createRoot, which
// replaces this markup with an identical client render on load.
export const render = (): string =>
  renderToString(
    <React.StrictMode>
      <App />
    </React.StrictMode>,
  )
