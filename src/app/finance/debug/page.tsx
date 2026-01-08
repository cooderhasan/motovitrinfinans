'use client'

import { useQuery } from '@tanstack/react-query'
import { format } from 'date-fns'

export default function DebugPage() {
    const { data, isLoading, error } = useQuery({
        queryKey: ['debug-invoices'],
        queryFn: async () => {
            const res = await fetch('/api/debug/invoices')
            if (!res.ok) throw new Error('Failed')
            return res.json()
        }
    })

    if (isLoading) return <div className="p-10">Veritabanı taranıyor...</div>
    if (error) return <div className="p-10 text-red-500">Hata: {error.message}</div>

    return (
        <div className="p-6">
            <h1 className="text-2xl font-bold mb-4">Sistem Denetim Ekranı (Debug)</h1>
            <p className="mb-4 text-gray-600">
                Veritabanına son eklenen 50 fatura (Filtresiz ham veri).
                Burada görünen ama listede görünmeyen faturalar, tarih veya cari eşleşme sorunu yaşıyordur.
            </p>

            <div className="bg-white rounded shadow overflow-auto">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="bg-gray-100 border-b">
                            <th className="p-3">ID</th>
                            <th className="p-3">Oluşturulma (Sistem)</th>
                            <th className="p-3">Fatura Tarihi</th>
                            <th className="p-3">Tedarikçi</th>
                            <th className="p-3">Tutar</th>
                            <th className="p-3">UUID</th>
                        </tr>
                    </thead>
                    <tbody>
                        {data?.invoices?.map((inv: any) => (
                            <tr key={inv.id} className="border-b hover:bg-gray-50">
                                <td className="p-3 font-mono text-xs">{inv.id}</td>
                                <td className="p-3 text-sm">
                                    {format(new Date(inv.created), 'dd.MM.yyyy HH:mm')}
                                </td>
                                <td className="p-3 text-sm font-bold text-blue-600">
                                    {format(new Date(inv.date), 'dd.MM.yyyy')}
                                </td>
                                <td className="p-3">{inv.supplier}</td>
                                <td className="p-3 font-bold">{inv.amount}</td>
                                <td className="p-3 font-mono text-xs text-gray-500">{inv.uuid}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            <div className="mt-4 bg-gray-100 p-4 rounded text-xs font-mono">
                Total Records: {data?.count}
            </div>
        </div>
    )
}
