import { useEffect, useState } from 'react'

export interface HistoryEntry {
    timestamp: number
    direction: 'ido-epo' | 'epo-ido'
    input: string
    output: string
}

const STORAGE_KEY = 'translator.history.v1'
const MAX_ENTRIES = 20

function loadHistory(): HistoryEntry[] {
    if (typeof window === 'undefined') return []
    try {
        const raw = window.localStorage.getItem(STORAGE_KEY)
        if (!raw) return []
        const parsed = JSON.parse(raw)
        return Array.isArray(parsed) ? parsed : []
    } catch {
        return []
    }
}

function saveHistory(items: HistoryEntry[]) {
    if (typeof window === 'undefined') return
    try {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items))
    } catch {
        // Storage quota or disabled — silently ignore
    }
}

export function useTranslationHistory() {
    const [history, setHistory] = useState<HistoryEntry[]>(() => loadHistory())

    // Persist on every change
    useEffect(() => {
        saveHistory(history)
    }, [history])

    const addEntry = (entry: Omit<HistoryEntry, 'timestamp'>) => {
        // Skip empty or unchanged entries
        if (!entry.input.trim() || !entry.output.trim()) return
        setHistory(prev => {
            const e: HistoryEntry = { ...entry, timestamp: Date.now() }
            // Drop any prior entry with the exact same input+direction (so re-running
            // a translation just bumps it to the top instead of duplicating)
            const filtered = prev.filter(
                p => !(p.input === e.input && p.direction === e.direction)
            )
            return [e, ...filtered].slice(0, MAX_ENTRIES)
        })
    }

    const removeEntry = (timestamp: number) => {
        setHistory(prev => prev.filter(p => p.timestamp !== timestamp))
    }

    const clearAll = () => setHistory([])

    return { history, addEntry, removeEntry, clearAll }
}
