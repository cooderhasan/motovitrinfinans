'use client'

import { useState, useEffect } from 'react'

export default function DebugPage() {
    const [data, setData] = useState<any>(null)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')

    useEffect(() => {
        console.log('Debug Page Mounted')
    }, [])

    const loadData = async () => {
        setLoading(true)
        setError('')
        try {
            const res = await fetch('/api/debug/invoices')
            if (!res.ok) throw new Error('API Hatası: ' + res.status)
            const json = await res.json()
            setData(json)
        } catch (err: any) {
            setError(err.message)
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="p-6 bg-white min-h-screen">
            <h1 className="text-2xl font-bold mb-4 text-black">Debug Ekranı V2</h1>
            <button
                onClick={loadData}
                className="bg-blue-600 text-white px-4 py-2 rounded"
            >
                Verileri Getir
            </button>

            {loading && <div className="mt-4 text-gray-600">Yükleniyor...</div>}
            {error && <div className="mt-4 text-red-600 font-bold">{error}</div>}

            {data && (
                <div className="mt-4 p-4 bg-gray-100 rounded overflow-auto">
                    <pre className="text-xs text-black">{JSON.stringify(data, null, 2)}</pre>
                </div>
            )}
        </div>
    )
}
