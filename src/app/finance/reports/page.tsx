'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { FileText, Printer, FileDown } from 'lucide-react'

// Carileri Cekme
async function getCaries() {
    const res = await fetch('/api/caries')
    if (!res.ok) throw new Error('Cariler cekilemedi')
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
    const [selectedCari, setSelectedCari] = useState<any>(null)
    const [loading, setLoading] = useState(false)

    const { data: caries } = useQuery({ queryKey: ['caries'], queryFn: getCaries })

    const handleGenerate = async () => {
        if (!filter.cariId) {
            alert('Lutfen bir cari seciniz.')
            return
        }
        setLoading(true)

        // Secili cariyi bul
        const cari = caries?.find((c: any) => c.id === parseInt(filter.cariId))
        setSelectedCari(cari)

        try {
            const res = await fetch('/api/reports/statement', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(filter)
            })
            if (!res.ok) throw new Error('Rapor alinamadi')
            const data = await res.json()
            setReportData(data.statement)
        } catch (error) {
            alert('Hata olustu')
        } finally {
            setLoading(false)
        }
    }

    const handlePrint = () => {
        window.print()
    }

    const handlePDF = async () => {
        if (!reportData || reportData.length === 0) {
            alert('Oncelikle rapor olusturun')
            return
        }

        const { default: jsPDF } = await import('jspdf')
        const { default: autoTable } = await import('jspdf-autotable')

        const doc = new jsPDF()

        // Baslik
        doc.setFontSize(18)
        doc.text('Cari Ekstre', 14, 20)

        // Cari Bilgileri
        doc.setFontSize(12)
        doc.text(`Cari: ${selectedCari?.title || '-'}`, 14, 32)
        doc.text(`Para Birimi: ${filter.currencyCode}`, 14, 40)
        doc.text(`Tarih: ${new Date().toLocaleDateString('tr-TR')}`, 14, 48)

        // Tablo
        const tableData = reportData.map((row: any) => [
            new Date(row.transactionDate).toLocaleDateString('tr-TR'),
            row.source,
            row.description || '-',
            row.debit > 0 ? row.debit.toLocaleString('tr-TR', { minimumFractionDigits: 2 }) : '-',
            row.credit > 0 ? row.credit.toLocaleString('tr-TR', { minimumFractionDigits: 2 }) : '-',
            row.balance.toLocaleString('tr-TR', { minimumFractionDigits: 2 })
        ])

        autoTable(doc, {
            head: [['Tarih', 'Islem', 'Aciklama', 'Borc', 'Alacak', 'Bakiye']],
            body: tableData,
            startY: 55,
            styles: { fontSize: 9 },
            headStyles: { fillColor: [51, 65, 85] },
            columnStyles: {
                3: { halign: 'right' },
                4: { halign: 'right' },
                5: { halign: 'right', fontStyle: 'bold' }
            }
        })

        // Son bakiye
        const lastRow = reportData[reportData.length - 1]
        const finalY = (doc as any).lastAutoTable.finalY + 10
        doc.setFontSize(11)
        doc.setFont(undefined as any, 'bold')
        doc.text(`Son Bakiye: ${lastRow.balance.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} ${filter.currencyCode}`, 14, finalY)

        doc.save(`ekstre_${selectedCari?.title || 'cari'}_${new Date().toISOString().split('T')[0]}.pdf`)
    }

    return (
        <div className="space-y-6">
            <div className="no-print">
                <h2 className="text-2xl md:text-3xl font-bold tracking-tight">Raporlar</h2>
                <p className="text-muted-foreground text-sm">Cari ekstre ve finansal dokumler</p>
            </div>

            {/* Filtre Alani */}
            <Card className="no-print">
                <CardHeader className="pb-3">
                    <CardTitle className="text-lg">Ekstre Filtresi</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="grid gap-4 md:grid-cols-5">
                        <div className="space-y-1">
                            <Label className="text-xs">Cari Hesap</Label>
                            <select
                                className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm"
                                value={filter.cariId}
                                onChange={(e) => setFilter({ ...filter, cariId: e.target.value })}
                            >
                                <option value="">Seciniz</option>
                                {caries?.map((c: any) => (
                                    <option key={c.id} value={c.id}>{c.title}</option>
                                ))}
                            </select>
                        </div>
                        <div className="space-y-1">
                            <Label className="text-xs">Para Birimi</Label>
                            <select
                                className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm"
                                value={filter.currencyCode}
                                onChange={(e) => setFilter({ ...filter, currencyCode: e.target.value })}
                            >
                                <option value="TL">TL</option>
                                <option value="USD">USD</option>
                            </select>
                        </div>
                        <div className="space-y-1">
                            <Label className="text-xs">Baslangic</Label>
                            <Input type="date" className="h-9" value={filter.startDate} onChange={(e) => setFilter({ ...filter, startDate: e.target.value })} />
                        </div>
                        <div className="space-y-1">
                            <Label className="text-xs">Bitis</Label>
                            <Input type="date" className="h-9" value={filter.endDate} onChange={(e) => setFilter({ ...filter, endDate: e.target.value })} />
                        </div>
                        <div className="flex items-end">
                            <Button className="w-full h-9" onClick={handleGenerate} disabled={loading}>
                                <FileText className="mr-2 h-4 w-4" />
                                {loading ? 'Yukleniyor...' : 'Raporla'}
                            </Button>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Rapor Sonucu */}
            {reportData && (
                <Card>
                    {/* Cari Baslik */}
                    <CardHeader className="border-b bg-slate-50">
                        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                            <div>
                                <h3 className="text-xl font-bold text-slate-800">{selectedCari?.title}</h3>
                                <p className="text-sm text-slate-500">
                                    Para Birimi: <span className="font-semibold">{filter.currencyCode}</span>
                                    {filter.startDate && ` | Baslangic: ${filter.startDate}`}
                                    {filter.endDate && ` | Bitis: ${filter.endDate}`}
                                </p>
                            </div>
                            <div className="flex gap-2 no-print">
                                <Button variant="outline" size="sm" onClick={handlePrint}>
                                    <Printer className="mr-2 h-4 w-4" /> Yazdir
                                </Button>
                                <Button variant="default" size="sm" onClick={handlePDF}>
                                    <FileDown className="mr-2 h-4 w-4" /> PDF Indir
                                </Button>
                            </div>
                        </div>
                    </CardHeader>

                    {/* Print Header */}
                    <div className="hidden print-only p-4 border-b">
                        <h1 className="text-xl font-bold">{selectedCari?.title} - Cari Ekstre</h1>
                        <p className="text-sm">Para Birimi: {filter.currencyCode} | Tarih: {new Date().toLocaleDateString('tr-TR')}</p>
                    </div>

                    <CardContent className="p-0">
                        <Table>
                            <TableHeader>
                                <TableRow className="bg-slate-100">
                                    <TableHead className="w-24">Tarih</TableHead>
                                    <TableHead className="w-28">Islem</TableHead>
                                    <TableHead>Aciklama</TableHead>
                                    <TableHead className="text-right w-28 text-rose-600">Borc</TableHead>
                                    <TableHead className="text-right w-28 text-emerald-600">Alacak</TableHead>
                                    <TableHead className="text-right w-32 font-bold">Bakiye</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {reportData.map((row: any, i: number) => (
                                    <TableRow key={i} className="hover:bg-slate-50">
                                        <TableCell className="text-sm">{new Date(row.transactionDate).toLocaleDateString('tr-TR')}</TableCell>
                                        <TableCell className="text-xs font-medium text-slate-500 uppercase">{row.source}</TableCell>
                                        <TableCell className="text-sm">{row.description || '-'}</TableCell>
                                        <TableCell className="text-right font-mono text-rose-600">
                                            {row.debit > 0 ? row.debit.toLocaleString('tr-TR', { minimumFractionDigits: 2 }) : '-'}
                                        </TableCell>
                                        <TableCell className="text-right font-mono text-emerald-600">
                                            {row.credit > 0 ? row.credit.toLocaleString('tr-TR', { minimumFractionDigits: 2 }) : '-'}
                                        </TableCell>
                                        <TableCell className="text-right font-bold font-mono">
                                            {row.balance.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
                                        </TableCell>
                                    </TableRow>
                                ))}
                                {reportData.length === 0 && (
                                    <TableRow>
                                        <TableCell colSpan={6} className="text-center h-24 text-slate-400">
                                            Kayit bulunamadi.
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>

                        {/* Ozet */}
                        {reportData.length > 0 && (
                            <div className="border-t p-4 bg-slate-50 flex justify-end">
                                <div className="text-right">
                                    <span className="text-sm text-slate-500">Son Bakiye:</span>
                                    <span className={`ml-2 text-xl font-bold ${reportData[reportData.length - 1].balance >= 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                                        {reportData[reportData.length - 1].balance.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} {filter.currencyCode}
                                    </span>
                                </div>
                            </div>
                        )}
                    </CardContent>
                </Card>
            )}

            {/* Bos Durum */}
            {!reportData && (
                <Card>
                    <CardContent className="py-16 text-center text-slate-400">
                        Cari secerek ekstre olusturun.
                    </CardContent>
                </Card>
            )}
        </div>
    )
}
