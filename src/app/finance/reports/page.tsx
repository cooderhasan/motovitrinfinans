'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { FileText, Printer, FileSpreadsheet } from 'lucide-react'

// Carileri Çekme
async function getCaries() {
    const res = await fetch('/api/caries')
    if (!res.ok) throw new Error('Cariler çekilemedi')
    return res.json()
}

export default function ReportsPage() {
    const [filter, setFilter] = useState({
        cariId: '',
        startDate: '',
        endDate: '',
        currencyCode: 'TL'
    })
    const [reportData, setReportData] = useState<any>(null)
    const [loading, setLoading] = useState(false)

    const { data: caries } = useQuery({ queryKey: ['caries'], queryFn: getCaries })

    const handleGenerate = async () => {
        if (!filter.cariId) {
            alert('Lütfen bir cari seçiniz.')
            return
        }
        setLoading(true)
        try {
            const res = await fetch('/api/reports/statement', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(filter)
            })
            if (!res.ok) throw new Error('Rapor alınamadı')
            const data = await res.json()
            setReportData(data.statement)
        } catch (error) {
            alert('Hata oluştu')
        } finally {
            setLoading(false)
        }
    }

    const print = () => {
        window.print()
    }

    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-3xl font-bold tracking-tight">Raporlar</h2>
                <p className="text-muted-foreground">Detaylı finansal dökümler</p>
            </div>

            <div className="grid gap-6 md:grid-cols-4">
                <Card className="md:col-span-1 h-fit">
                    <CardHeader>
                        <CardTitle>Ekstre Filtresi</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <Label>Cari Hesap</Label>
                            <select
                                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                                value={filter.cariId}
                                onChange={(e) => setFilter({ ...filter, cariId: e.target.value })}
                            >
                                <option value="">Seçiniz</option>
                                {caries?.map((c: any) => (
                                    <option key={c.id} value={c.id}>{c.title}</option>
                                ))}
                            </select>
                        </div>
                        <div className="space-y-2">
                            <Label>Para Birimi</Label>
                            <select
                                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                                value={filter.currencyCode}
                                onChange={(e) => setFilter({ ...filter, currencyCode: e.target.value })}
                            >
                                <option value="TL">TL</option>
                                <option value="USD">USD</option>
                            </select>
                        </div>
                        <div className="space-y-2">
                            <Label>Başlangıç Tarihi</Label>
                            <Input type="date" value={filter.startDate} onChange={(e) => setFilter({ ...filter, startDate: e.target.value })} />
                        </div>
                        <div className="space-y-2">
                            <Label>Bitiş Tarihi</Label>
                            <Input type="date" value={filter.endDate} onChange={(e) => setFilter({ ...filter, endDate: e.target.value })} />
                        </div>
                        <Button className="w-full" onClick={handleGenerate} disabled={loading}>
                            <FileText className="mr-2 h-4 w-4" />
                            {loading ? 'Hazırlanıyor...' : 'Raporla'}
                        </Button>
                    </CardContent>
                </Card>

                <Card className="md:col-span-3">
                    <CardHeader className="flex flex-row items-center justify-between">
                        <CardTitle>Cari Hareket Dökümü</CardTitle>
                        <div className="flex gap-2">
                            <Button variant="outline" size="sm" onClick={print}>
                                <Printer className="mr-2 h-4 w-4" /> Yazdır
                            </Button>
                            <Button variant="outline" size="sm">
                                <FileSpreadsheet className="mr-2 h-4 w-4" /> Excel
                            </Button>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Tarih</TableHead>
                                    <TableHead>İşlem Türü</TableHead>
                                    <TableHead>Açıklama</TableHead>
                                    <TableHead className="text-right text-rose-600">Borç</TableHead>
                                    <TableHead className="text-right text-emerald-600">Alacak</TableHead>
                                    <TableHead className="text-right font-bold">Bakiye</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {reportData?.map((row: any, i: number) => (
                                    <TableRow key={i}>
                                        <TableCell>{new Date(row.transactionDate).toLocaleDateString('tr-TR')}</TableCell>
                                        <TableCell className="uppercase text-xs font-semibold text-slate-500">{row.source}</TableCell>
                                        <TableCell>{row.description}</TableCell>
                                        <TableCell className="text-right text-rose-600 font-mono">
                                            {row.debit > 0 ? row.debit.toLocaleString('tr-TR', { minimumFractionDigits: 2 }) : '-'}
                                        </TableCell>
                                        <TableCell className="text-right text-emerald-600 font-mono">
                                            {row.credit > 0 ? row.credit.toLocaleString('tr-TR', { minimumFractionDigits: 2 }) : '-'}
                                        </TableCell>
                                        <TableCell className="text-right font-bold font-mono text-slate-800">
                                            {row.balance.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
                                        </TableCell>
                                    </TableRow>
                                ))}
                                {!reportData && (
                                    <TableRow>
                                        <TableCell colSpan={6} className="text-center h-32 text-slate-400">
                                            Lütfen filtre seçip raporlayınız.
                                        </TableCell>
                                    </TableRow>
                                )}
                                {reportData && reportData.length === 0 && (
                                    <TableRow>
                                        <TableCell colSpan={6} className="text-center h-32 text-slate-400">
                                            Kayıt bulunamadı.
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}
