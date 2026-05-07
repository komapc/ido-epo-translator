import { useState } from 'react'
import { History, X, Trash2, ChevronDown, ChevronUp } from 'lucide-react'
import type { HistoryEntry } from '../hooks/useTranslationHistory'

interface HistoryPanelProps {
    entries: HistoryEntry[]
    onRestore: (entry: HistoryEntry) => void
    onRemove: (timestamp: number) => void
    onClear: () => void
}

const formatTime = (ts: number): string => {
    const d = new Date(ts)
    const now = Date.now()
    const diff = now - ts
    const min = 60_000
    const hour = 60 * min
    const day = 24 * hour
    if (diff < hour) return `${Math.max(1, Math.round(diff / min))}m ago`
    if (diff < day) return `${Math.round(diff / hour)}h ago`
    return d.toLocaleDateString()
}

const truncate = (s: string, n = 80) =>
    s.length <= n ? s : s.slice(0, n - 1) + '…'

const HistoryPanel = ({ entries, onRestore, onRemove, onClear }: HistoryPanelProps) => {
    const [expanded, setExpanded] = useState(false)

    if (entries.length === 0) return null

    return (
        <div className="bg-white/10 backdrop-blur-sm rounded-xl shadow-xl mt-4">
            <button
                onClick={() => setExpanded(v => !v)}
                className="w-full flex items-center justify-between p-4 text-white hover:bg-white/5 rounded-xl transition-colors"
                aria-expanded={expanded}
            >
                <div className="flex items-center gap-2">
                    <History className="w-5 h-5" />
                    <span className="font-medium">Recent translations</span>
                    <span className="text-sm text-purple-300">({entries.length})</span>
                </div>
                {expanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
            </button>
            {expanded && (
                <div className="border-t border-white/10 p-4">
                    <div className="flex justify-end mb-2">
                        <button
                            onClick={onClear}
                            className="flex items-center gap-1 text-xs text-purple-300 hover:text-white transition-colors"
                            aria-label="Clear all history"
                        >
                            <Trash2 className="w-3 h-3" />
                            Clear all
                        </button>
                    </div>
                    <ul className="space-y-2">
                        {entries.map(e => (
                            <li
                                key={e.timestamp}
                                className="group bg-white/5 hover:bg-white/10 rounded-lg p-3 transition-colors"
                            >
                                <div className="flex items-start justify-between gap-2">
                                    <button
                                        onClick={() => onRestore(e)}
                                        className="flex-1 text-left"
                                        title="Click to restore"
                                    >
                                        <div className="text-xs text-purple-300 mb-1">
                                            {e.direction === 'ido-epo' ? 'IO → EO' : 'EO → IO'}
                                            <span className="ml-2">{formatTime(e.timestamp)}</span>
                                        </div>
                                        <div className="text-sm text-white truncate">
                                            {truncate(e.input)}
                                        </div>
                                        <div className="text-sm text-purple-200 truncate mt-0.5">
                                            → {truncate(e.output)}
                                        </div>
                                    </button>
                                    <button
                                        onClick={() => onRemove(e.timestamp)}
                                        className="p-1 text-purple-300 hover:text-white opacity-0 group-hover:opacity-100 transition-opacity"
                                        aria-label="Remove this entry"
                                    >
                                        <X className="w-4 h-4" />
                                    </button>
                                </div>
                            </li>
                        ))}
                    </ul>
                </div>
            )}
        </div>
    )
}

export default HistoryPanel
