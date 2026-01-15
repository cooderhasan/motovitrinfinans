
'use client'

import { useState } from 'react'

export default function DebugPage() {
    const [data, setData] = useState<any>(null)
    const [loading, setLoading] = useState(false)

    const handleCheck = async () => {
        setLoading(true)
        try {
            const res = await fetch('/api/debug/check-cari')
            const json = await res.json()
            setData(json)
        } catch (e) {
            alert('Error')
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="p-8">
            <button onClick={handleCheck} className="bg-blue-500 text-white p-2 rounded">
                Check Ali Bay
            </button>
            <pre className="mt-4 bg-slate-100 p-4 rounded text-xs overflow-auto h-[500px]">
                {loading ? 'Loading...' : JSON.stringify(data, null, 2)}
            </pre>
        </div>
    )
}
