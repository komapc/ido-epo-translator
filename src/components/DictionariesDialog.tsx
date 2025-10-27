import { useState, useEffect } from 'react'
import { X, ExternalLink, GitPullRequest, Hammer, CheckCircle, AlertCircle, RefreshCw } from 'lucide-react'

interface RepoInfo {
    label: string
    owner: string
    repo: string
    version?: string | null
    buildDate?: string | null
    lastCommitDate?: string | null
    currentHash?: string | null
    latestHash?: string | null
    lastBuiltHash?: string | null
    needsPull: boolean
    needsBuild: boolean
    isUpToDate: boolean
    githubUrl: string
}

interface DictionariesDialogProps {
    isOpen: boolean
    onClose: () => void
}

type RepoOperation = 'idle' | 'pulling' | 'building' | 'success' | 'error'

interface RepoStatus {
    pullStatus: RepoOperation
    buildStatus: RepoOperation
    pullMessage?: string
    buildMessage?: string
}

const DictionariesDialog = ({ isOpen, onClose }: DictionariesDialogProps) => {
    const [repos, setRepos] = useState<RepoInfo[]>([])
    const [loading, setLoading] = useState(false)
    const [repoStatuses, setRepoStatuses] = useState<Record<string, RepoStatus>>({})

    const fetchRepos = async () => {
        setLoading(true)
        try {
            const res = await fetch('/api/versions')
            const data = await res.json()

            if (Array.isArray(data?.repos)) {
                const enhancedRepos = data.repos.map((repo: any) => ({
                    ...repo,
                    needsPull: repo.currentHash !== repo.latestHash,
                    needsBuild: repo.lastBuiltHash !== repo.currentHash,
                    isUpToDate: repo.currentHash === repo.latestHash && repo.lastBuiltHash === repo.currentHash,
                    githubUrl: `https://github.com/${repo.owner}/${repo.repo}`
                }))
                setRepos(enhancedRepos)

                // Initialize status for each repo
                const initialStatuses: Record<string, RepoStatus> = {}
                enhancedRepos.forEach((repo: RepoInfo) => {
                    initialStatuses[repo.label] = {
                        pullStatus: 'idle',
                        buildStatus: 'idle'
                    }
                })
                setRepoStatuses(initialStatuses)
            }
        } catch (error) {
            console.error('Failed to fetch repositories:', error)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        if (isOpen) {
            fetchRepos()
        }
    }, [isOpen])

    const handlePull = async (repoLabel: string) => {
        setRepoStatuses(prev => ({
            ...prev,
            [repoLabel]: { ...prev[repoLabel], pullStatus: 'pulling', pullMessage: 'Pulling latest changes...' }
        }))

        try {
            const res = await fetch('/api/admin/pull-repo', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ repo: repoLabel })
            })

            const data = await res.json()

            if (res.ok && data.status === 'success') {
                setRepoStatuses(prev => ({
                    ...prev,
                    [repoLabel]: {
                        ...prev[repoLabel],
                        pullStatus: 'success',
                        pullMessage: data.changes?.hasChanges
                            ? `Updated: ${data.changes.commitCount} new commits`
                            : 'Already up to date'
                    }
                }))

                // Refresh repo data after successful pull
                await fetchRepos()
            } else {
                setRepoStatuses(prev => ({
                    ...prev,
                    [repoLabel]: {
                        ...prev[repoLabel],
                        pullStatus: 'error',
                        pullMessage: data.error || 'Pull failed'
                    }
                }))
            }
        } catch (error) {
            setRepoStatuses(prev => ({
                ...prev,
                [repoLabel]: {
                    ...prev[repoLabel],
                    pullStatus: 'error',
                    pullMessage: 'Network error during pull'
                }
            }))
        }
    }

    const handleBuild = async (repoLabel: string) => {
        setRepoStatuses(prev => ({
            ...prev,
            [repoLabel]: { ...prev[repoLabel], buildStatus: 'building', buildMessage: 'Building and installing...' }
        }))

        try {
            const res = await fetch('/api/admin/build-repo', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ repo: repoLabel })
            })

            const data = await res.json()

            if (res.ok && data.status === 'accepted') {
                setRepoStatuses(prev => ({
                    ...prev,
                    [repoLabel]: {
                        ...prev[repoLabel],
                        buildStatus: 'success',
                        buildMessage: data.message || 'Build completed successfully'
                    }
                }))

                // Refresh repo data after successful build
                await fetchRepos()
            } else {
                setRepoStatuses(prev => ({
                    ...prev,
                    [repoLabel]: {
                        ...prev[repoLabel],
                        buildStatus: 'error',
                        buildMessage: data.error || 'Build failed'
                    }
                }))
            }
        } catch (error) {
            setRepoStatuses(prev => ({
                ...prev,
                [repoLabel]: {
                    ...prev[repoLabel],
                    buildStatus: 'error',
                    buildMessage: 'Network error during build'
                }
            }))
        }
    }

    const getStatusIcon = (status: RepoOperation) => {
        switch (status) {
            case 'pulling':
            case 'building':
                return <RefreshCw className="w-4 h-4 animate-spin" />
            case 'success':
                return <CheckCircle className="w-4 h-4 text-green-400" />
            case 'error':
                return <AlertCircle className="w-4 h-4 text-red-400" />
            default:
                return null
        }
    }

    const formatDate = (dateString: string | null | undefined) => {
        if (!dateString) return 'Unknown'
        return new Date(dateString).toLocaleDateString()
    }

    const formatHash = (hash: string | null | undefined) => {
        if (!hash) return 'Unknown'
        return hash.substring(0, 7)
    }

    if (!isOpen) return null

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-gray-800 rounded-lg max-w-4xl w-full max-h-[90vh] overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-gray-700">
                    <h2 className="text-xl font-semibold text-white">Dictionary Repositories</h2>
                    <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-white transition-colors"
                    >
                        <X className="w-6 h-6" />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
                    {loading ? (
                        <div className="flex items-center justify-center py-8">
                            <RefreshCw className="w-6 h-6 animate-spin text-blue-400 mr-2" />
                            <span className="text-gray-300">Loading repositories...</span>
                        </div>
                    ) : (
                        <div className="space-y-6">
                            {repos.map((repo) => {
                                const status = repoStatuses[repo.label] || { pullStatus: 'idle', buildStatus: 'idle' }

                                return (
                                    <div key={repo.label} className="bg-gray-700 rounded-lg p-6">
                                        {/* Repository Header */}
                                        <div className="flex items-center justify-between mb-4">
                                            <div className="flex items-center gap-3">
                                                <h3 className="text-lg font-medium text-white">
                                                    {repo.repo}
                                                </h3>
                                                <span className="text-sm text-gray-400">
                                                    ({repo.label})
                                                </span>
                                                {repo.isUpToDate && (
                                                    <CheckCircle className="w-5 h-5 text-green-400" />
                                                )}
                                            </div>
                                            <a
                                                href={repo.githubUrl}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="flex items-center gap-1 text-blue-400 hover:text-blue-300 transition-colors"
                                            >
                                                <ExternalLink className="w-4 h-4" />
                                                GitHub
                                            </a>
                                        </div>

                                        {/* Repository Info */}
                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4 text-sm">
                                            <div>
                                                <span className="text-gray-400">Current:</span>
                                                <div className="text-white">
                                                    {formatHash(repo.currentHash)}
                                                    {repo.buildDate && (
                                                        <div className="text-xs text-gray-400">
                                                            Built: {formatDate(repo.buildDate)}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                            <div>
                                                <span className="text-gray-400">Latest:</span>
                                                <div className="text-white">
                                                    {formatHash(repo.latestHash)}
                                                    {repo.lastCommitDate && (
                                                        <div className="text-xs text-gray-400">
                                                            {formatDate(repo.lastCommitDate)}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                            <div>
                                                <span className="text-gray-400">Status:</span>
                                                <div className={`text-sm font-medium ${repo.isUpToDate ? 'text-green-400' :
                                                    repo.needsPull ? 'text-yellow-400' : 'text-orange-400'
                                                    }`}>
                                                    {repo.isUpToDate ? 'Up to date' :
                                                        repo.needsPull ? 'Needs pull' : 'Needs build'}
                                                </div>
                                            </div>
                                        </div>

                                        {/* Action Buttons */}
                                        <div className="flex gap-3">
                                            <button
                                                onClick={() => handlePull(repo.label)}
                                                disabled={status.pullStatus === 'pulling' || !repo.needsPull}
                                                className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-lg transition-colors"
                                            >
                                                {status.pullStatus === 'pulling' ? (
                                                    <RefreshCw className="w-4 h-4 animate-spin" />
                                                ) : (
                                                    <GitPullRequest className="w-4 h-4" />
                                                )}
                                                {status.pullStatus === 'pulling' ? 'Pulling...' : 'Pull Updates'}
                                            </button>

                                            <button
                                                onClick={() => handleBuild(repo.label)}
                                                disabled={status.buildStatus === 'building' || !repo.needsBuild}
                                                className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-lg transition-colors"
                                            >
                                                {status.buildStatus === 'building' ? (
                                                    <RefreshCw className="w-4 h-4 animate-spin" />
                                                ) : (
                                                    <Hammer className="w-4 h-4" />
                                                )}
                                                {status.buildStatus === 'building' ? 'Building...' : 'Build & Install'}
                                            </button>
                                        </div>

                                        {/* Status Messages */}
                                        {(status.pullMessage || status.buildMessage) && (
                                            <div className="mt-4 space-y-2">
                                                {status.pullMessage && (
                                                    <div className="flex items-center gap-2 text-sm">
                                                        {getStatusIcon(status.pullStatus)}
                                                        <span className={
                                                            status.pullStatus === 'error' ? 'text-red-400' :
                                                                status.pullStatus === 'success' ? 'text-green-400' : 'text-gray-300'
                                                        }>
                                                            {status.pullMessage}
                                                        </span>
                                                    </div>
                                                )}
                                                {status.buildMessage && (
                                                    <div className="flex items-center gap-2 text-sm">
                                                        {getStatusIcon(status.buildStatus)}
                                                        <span className={
                                                            status.buildStatus === 'error' ? 'text-red-400' :
                                                                status.buildStatus === 'success' ? 'text-green-400' : 'text-gray-300'
                                                        }>
                                                            {status.buildMessage}
                                                        </span>
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                )
                            })}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between p-6 border-t border-gray-700">
                    <button
                        onClick={fetchRepos}
                        disabled={loading}
                        className="flex items-center gap-2 px-4 py-2 text-gray-400 hover:text-white transition-colors"
                    >
                        <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                        Refresh
                    </button>
                    <button
                        onClick={onClose}
                        className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors"
                    >
                        Close
                    </button>
                </div>
            </div>
        </div>
    )
}

export default DictionariesDialog