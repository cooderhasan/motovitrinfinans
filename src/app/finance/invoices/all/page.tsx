'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Search, Filter, FileText, Download } from 'lucide-react'
import Link from 'next/link'

async function getInvoices(params: string) {
    const res = await fetch(`/api/invoices?${params}`)
    if (!res.ok) throw new Error('Faturalar yüklenemedi')
    return res.json()
}

async function getSuppliers() {
    const res = await fetch('/api/caries?type=SUPPLIER')
    if (!res.ok) throw new Error('Tedarikçiler yüklenemedi')
    return res.json()
}

export default function AllInvoicesPage() {
    const [filters, setFilters] = useState({
        startDate: '',
        endDate: '',
        supplierId: 'all'
    })

    // Construct query string
    const queryParams = new URLSearchParams()
    if (filters.startDate) queryParams.append('startDate', filters.startDate)
    if (filters.endDate) queryParams.append('endDate', filters.endDate)
    if (filters.supplierId && filters.supplierId !== 'all') queryParams.append('supplierId', filters.supplierId)

    const { data: invoices, isLoading } = useQuery({
        queryKey: ['invoices', filters.startDate, filters.endDate, filters.supplierId],
        queryFn: () => getInvoices(queryParams.toString())
    })

    const { data: suppliers } = useQuery({
        queryKey: ['suppliers'],
        queryFn: getSuppliers
    })

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row justify-between gap-4 md:items-center">
                <div>
                    <h2 className="text-2xl font-bold tracking-tight">Tüm Gelen Faturalar</h2>
                    <p className="text-muted-foreground text-sm">E-Fatura ve Alış Faturaları Arşivi</p>
                </div>
                <Link href="/finance/invoices">
                    <Button variant="outline">Geri Dön</Button>
                </Link>
            </div>

            {/* Filters */}
            <Card>
                <CardHeader className="pb-3">
                    <CardTitle className="text-base font-medium flex items-center gap-2">
                        <Filter className="h-4 w-4" />
                        Filtreleme Seçenekleri
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <div>
                            <label className="text-sm font-medium mb-1 block">Başlangıç Tarihi</label>
                            <Input
                                type="date"
                                value={filters.startDate}
                                onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
                            />
                        </div>
                        <div>
                            <label className="text-sm font-medium mb-1 block">Bitiş Tarihi</label>
                            <Input
                                type="date"
                                value={filters.endDate}
                                onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
                            />
                        </div>
                        <div>
                            <label className="text-sm font-medium mb-1 block">Tedarikçi</label>
                            <Select
                                value={filters.supplierId}
                                onValueChange={(val) => setFilters({ ...filters, supplierId: val })}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Tümü" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">Tümü</SelectItem>
                                    {suppliers?.map((s: any) => (
                                        <SelectItem key={s.id} value={s.id.toString()}>
                                            {s.title}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="flex items-end">
                            <Button
                                variant="secondary"
                                className="w-full"
                                onClick={() => setFilters({ startDate: '', endDate: '', supplierId: 'all' })}
                            >
                                Temizle
                            </Button>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Results */}
            <Card>
                <CardContent className="p-0">
                    <Table>
                        <TableHeader>
                            <TableRow className="bg-slate-50">
                                <TableHead>Fatura No</TableHead>
                                <TableHead>Tarih</TableHead>
                                <TableHead>Tedarikçi</TableHead>
                                <TableHead className="text-right">Toplam Tutar</TableHead>
                                <TableHead className="w-[100px] text-center">İşlemler</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {isLoading ? (
                                <TableRow>
                                    <TableCell colSpan={5} className="h-24 text-center">
                                        Yükleniyor...
                                    </TableCell>
                                </TableRow>
                            ) : invoices?.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                                        Fatura bulunamadı.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                invoices?.map((inv: any) => (
                                    <TableRow key={inv.id}>
                                        <TableCell className="font-mono text-sm">
                                            {inv.invoiceNumber || (
                                                <span className="text-muted-foreground text-xs italic">Manuel</span>
                                            )}
                                        </TableCell>
                                        <TableCell>
                                            {new Date(inv.invoiceDate).toLocaleDateString('tr-TR')}
                                        </TableCell>
                                        <TableCell className="font-medium">
                                            {inv.supplier?.title}
                                        </TableCell>
                                        <TableCell className="text-right font-semibold text-slate-700">
                                            {Number(inv.totalAmount).toLocaleString('tr-TR', { minimumFractionDigits: 2 })} {inv.currency?.code}
                                        </TableCell>
                                        <TableCell className="text-center">
                                            {inv.uuid ? (
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    className="h-8 gap-1 text-blue-600 border-blue-200 hover:bg-blue-50"
                                                    onClick={() => window.open(`/api/finance/einvoice/html/${inv.uuid}`, '_blank')}
                                                >
                                                    <FileText className="h-3.5 w-3.5" />
                                                    PDF
                                                </Button>
                                            ) : (
                                                <span className="text-xs text-muted-foreground">-</span>
                                            )}
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    )
}
