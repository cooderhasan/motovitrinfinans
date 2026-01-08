'use client'

import { useState, useEffect } from 'react'

export default function DebugPage() {
    // Invoice Data
    const [data, setData] = useState<any>(null)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')

    // VKN Check Data
    const [vkn, setVkn] = useState('')
    const [vknResult, setVknResult] = useState<any>(null)
    const [vknLoading, setVknLoading] = useState(false)

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

    const checkVkn = async () => {
        if (!vkn) return
        setVknLoading(true)
        setVknResult(null)
        try {
            const res = await fetch(`/api/finance/einvoice/check-user?vkn=${vkn}`)
            const json = await res.json()
            setVknResult(json)
        } catch (err: any) {
            setVknResult({ error: err.message })
        } finally {
            setVknLoading(false)
        }
    }

    return (
        <div className="p-6 bg-white min-h-screen text-black">
            <h1 className="text-2xl font-bold mb-6">Sistem Denetim (Debug) V3</h1>

            {/* VKN TESTER */}
            <div className="mb-8 p-4 border rounded bg-blue-50">
                <h2 className="text-xl font-bold mb-4">1. VKN Sorgu Testi</h2>
                <div className="flex gap-2 mb-4">
                    <input
                        type="text"
                        value={vkn}
                        onChange={(e) => setVkn(e.target.value)}
                        placeholder="VKN / TCKN Girin"
                        className="border p-2 rounded w-64"
                    />
                    <button
                        onClick={checkVkn}
                        disabled={vknLoading}
                        className="bg-purple-600 text-white px-4 py-2 rounded disabled:opacity-50"
                    >
                        {vknLoading ? 'Sorgulanıyor...' : 'Mükellef Kontrol Et'}
                    </button>
                </div>
                {vknResult && (
                    <div className="bg-gray-800 text-green-400 p-4 rounded overflow-auto max-h-96 text-xs font-mono">
                        <pre>{JSON.stringify(vknResult, null, 2)}</pre>
                    </div>
                )}
            </div>

            {/* INVOICE LIST */}
            <div className="p-4 border rounded bg-gray-50">
                <h2 className="text-xl font-bold mb-4">2. Veritabanı Son Faturalar</h2>
                <button
                    onClick={loadData}
                    className="bg-blue-600 text-white px-4 py-2 rounded mb-4"
                >
                    {loading ? 'Yükleniyor...' : 'Listeyi Getir'}
                </button>

                {error && <div className="text-red-600 font-bold mb-2">{error}</div>}

                {data && (
                    <div className="bg-gray-100 p-4 rounded overflow-auto max-h-96">
                        <pre className="text-xs">{JSON.stringify(data, null, 2)}</pre>
                    </div>
                )}
            </div>
        </div>
    )
}
