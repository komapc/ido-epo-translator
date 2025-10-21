import { useState, useEffect } from 'react'
import { RefreshCw, CheckCircle, AlertCircle, Clock, Info } from 'lucide-react'

type RebuildStatus = 'idle' | 'checking' | 'running' | 'ok' | 'error' | 'up-to-date'

interface RepoInfo {
  label: string
  owner: string
  repo: string
  version?: string | null
  date?: string | null
  commit?: string | null
}

const RebuildButton = () => {
  const [status, setStatus] = useState<RebuildStatus>('idle')
  const [message, setMessage] = useState('')
  const [lastRebuildAt, setLastRebuildAt] = useState<string>('')
  const [elapsedSeconds, setElapsedSeconds] = useState(0)
  const [lastCheckedVersions, setLastCheckedVersions] = useState<RepoInfo[]>([])

  // Elapsed time counter during rebuild
  useEffect(() => {
    let interval: number | undefined
    if (status === 'running') {
      const startTime = Date.now()
      interval = window.setInterval(() => {
        setElapsedSeconds(Math.floor((Date.now() - startTime) / 1000))
      }, 1000)
    } else {
      setElapsedSeconds(0)
    }
    return () => {
      if (interval) clearInterval(interval)
    }
  }, [status])

  const formatElapsedTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const checkForUpdates = async (): Promise<boolean> => {
    try {
      const res = await fetch('/api/versions')
      const data = await res.json().catch(() => ({}))
      
      if (!Array.isArray(data?.repos)) {
        return true // Can't determine, allow rebuild
      }

      setLastCheckedVersions(data.repos)

      // Check if any repo has been updated recently (within last 24 hours)
      const now = Date.now()
      const oneDayAgo = now - (24 * 60 * 60 * 1000)
      
      const hasRecentUpdates = data.repos.some((repo: RepoInfo) => {
        if (repo.date) {
          const repoDate = new Date(repo.date).getTime()
          return repoDate > oneDayAgo
        }
        return false
      })

      return hasRecentUpdates
    } catch (e) {
      console.error('Failed to check versions:', e)
      return true // On error, allow rebuild
    }
  }

  const handleRebuild = async () => {
    if (status === 'running' || status === 'checking') return
    
    // First, check if update is needed
    setStatus('checking')
    setMessage('Checking for updates...')
    
    const hasUpdates = await checkForUpdates()
    
    if (!hasUpdates) {
      setStatus('up-to-date')
      setMessage('All dictionaries are up to date. No rebuild needed.')
      return
    }

    // Proceed with rebuild
    setStatus('running')
    setMessage('Starting rebuild process... (Est. 2-5 minutes)')
    
    try {
      const res = await fetch('/api/admin/rebuild', { 
        method: 'POST', 
        headers: { 'Content-Type': 'application/json' }, 
        body: JSON.stringify({}) 
      })
      const data = await res.json().catch(() => ({}))
      
      if (!res.ok || data.error) {
        setStatus('error')
        setMessage(data.error || `Failed to trigger rebuild (${res.status})`)
        return
      }
      
      setStatus('ok')
      const parts: string[] = []
      if (data.message) parts.push(String(data.message))
      if (data.log) parts.push(String(data.log))
      setMessage(parts.join('\n').trim() || 'Rebuild completed successfully!')
      setLastRebuildAt(new Date().toISOString())
    } catch (e) {
      setStatus('error')
      setMessage('Network error while triggering rebuild')
    }
  }

  const getStatusColor = () => {
    switch (status) {
      case 'ok':
        return 'bg-[#1f7a3a]/20 text-green-200'
      case 'error':
        return 'bg-red-500/20 text-red-200'
      case 'up-to-date':
        return 'bg-blue-500/20 text-blue-200'
      case 'checking':
      case 'running':
        return 'bg-white/10 text-white'
      default:
        return 'bg-white/10 text-white'
    }
  }

  const getStatusIcon = () => {
    switch (status) {
      case 'ok':
        return <CheckCircle className="w-4 h-4" />
      case 'error':
        return <AlertCircle className="w-4 h-4" />
      case 'up-to-date':
        return <Info className="w-4 h-4" />
      case 'checking':
      case 'running':
        return <RefreshCw className="w-4 h-4 animate-spin" />
      default:
        return null
    }
  }

  return (
    <div className="flex items-center gap-3 flex-wrap">
      <button
        onClick={handleRebuild}
        disabled={status === 'running' || status === 'checking'}
        className="px-4 py-2 bg-[#1f7a3a] hover:bg-[#1a6a33] disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-medium rounded-lg transition-all flex items-center gap-2"
        aria-label="Trigger rebuild"
      >
        {status === 'checking' ? (
          <>
            <RefreshCw className="w-4 h-4 animate-spin" /> Checking...
          </>
        ) : status === 'running' ? (
          <>
            <RefreshCw className="w-4 h-4 animate-spin" /> Rebuilding ({formatElapsedTime(elapsedSeconds)})
          </>
        ) : (
          <>
            <RefreshCw className="w-4 h-4" /> Rebuild
          </>
        )}
      </button>
      
      {status !== 'idle' && (
        <div className={`text-sm rounded-md px-3 py-2 max-w-md ${getStatusColor()}`}>
          <div className="flex items-start gap-2">
            <div className="flex-shrink-0 mt-0.5">
              {getStatusIcon()}
            </div>
            <div className="flex-1">
              <div className="whitespace-pre-wrap">{message}</div>
              
              {status === 'running' && (
                <div className="mt-2 text-xs opacity-80">
                  <div className="flex items-center gap-2">
                    <div className="flex-1 bg-white/10 rounded-full h-1.5 overflow-hidden">
                      <div 
                        className="bg-green-400 h-full transition-all duration-1000"
                        style={{ 
                          width: `${Math.min((elapsedSeconds / 300) * 100, 100)}%` 
                        }}
                      />
                    </div>
                    <span className="text-xs">
                      {elapsedSeconds < 300 ? 'In progress...' : 'Almost done...'}
                    </span>
                  </div>
                </div>
              )}
              
              {lastRebuildAt && status === 'ok' && (
                <div className="flex items-center gap-1 mt-2 opacity-80 text-xs">
                  <Clock className="w-3 h-3" />
                  <span>Completed: {new Date(lastRebuildAt).toLocaleString()}</span>
                </div>
              )}
              
              {status === 'up-to-date' && lastCheckedVersions.length > 0 && (
                <div className="mt-2 text-xs opacity-80">
                  Latest versions:
                  {lastCheckedVersions.map((repo) => (
                    <div key={`${repo.owner}/${repo.repo}`} className="ml-2">
                      • {repo.label}: {repo.version || (repo.date ? new Date(repo.date).toISOString().slice(0, 10) : 'n/a')}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default RebuildButton


