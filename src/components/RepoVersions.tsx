import { useEffect, useState } from 'react'

interface RepoInfo {
  label: string
  owner: string
  repo: string
  version?: string | null
  date?: string | null
  commit?: string | null
}

const RepoVersions = () => {
  const [appVersion, setAppVersion] = useState<string>('')
  const [repos, setRepos] = useState<RepoInfo[]>([])

  useEffect(() => {
    const run = async () => {
      try {
        const res = await fetch('/api/versions')
        const data = await res.json().catch(() => ({}))
        if (data?.appVersion) setAppVersion(String(data.appVersion))
        if (Array.isArray(data?.repos)) setRepos(data.repos)
      } catch {}
    }
    run()
  }, [])

  return (
    <div className="mt-2 text-xs text-purple-200/80">
      <div>App: v{import.meta.env.VITE_APP_VERSION || appVersion || 'dev'}</div>
      <div className="flex justify-center gap-3 flex-wrap mt-1">
        {repos.map((r) => (
          <div key={`${r.owner}/${r.repo}`} className="bg-white/5 rounded px-2 py-1">
            <span className="uppercase">{r.label}</span>:
            {r.version ? (
              <span className="ml-1">{r.version}</span>
            ) : r.date ? (
              <span className="ml-1">{new Date(r.date).toISOString().slice(0, 16).replace('T', ' ')}</span>
            ) : r.commit ? (
              <span className="ml-1">{r.commit.slice(0, 7)}</span>
            ) : (
              <span className="ml-1">n/a</span>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

export default RepoVersions
