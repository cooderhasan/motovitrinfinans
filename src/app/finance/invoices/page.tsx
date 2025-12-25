'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useQuery } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Plus, Pencil } from 'lucide-react'

// Faturaları çekme
async function getInvoices() {
    const res = await fetch('/api/invoices')
    if (!res.ok) throw new Error('Faturalar çekilemedi')
    return res.json()
}

// Satış fişlerini çekme
async function getSales() {
    const res = await fetch('/api/sales')
    if (!res.ok) throw new Error('Satışlar çekilemedi')
    return res.json()
}

export default function InvoicesIndexPage() {
    const { data: invoices, isLoading: invoicesLoading } = useQuery({
        queryKey: ['invoices'],
        queryFn: getInvoices
    })

    const { data: sales, isLoading: salesLoading } = useQuery({
        queryKey: ['sales'],
        queryFn: getSales
    })

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">Faturalar & Fişler</h2>
                    <p className="text-muted-foreground text-sm">Alış ve Satış hareketlerinizi yönetin.</p>
                </div>
                <div className="flex flex-col sm:flex-row gap-2">
                    <Link href="/finance/invoices/new">
                        <Button className="bg-orange-600 hover:bg-orange-700 w-full sm:w-auto">
                            <Plus className="mr-2 h-4 w-4" /> Yeni Alış Faturası
                        </Button>
                    </Link>
                    <Link href="/finance/sales/new">
                        <Button className="bg-blue-600 hover:bg-blue-700 w-full sm:w-auto">
                            <Plus className="mr-2 h-4 w-4" /> Yeni Satış Fişi
                        </Button>
                    </Link>
                </div>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
                {/* Son Alış Faturaları */}
                <Card className="border-l-4 border-l-orange-500">
                    <CardHeader>
                        <CardTitle className="text-xl font-semibold text-slate-800">Son Alış Faturaları</CardTitle>
                        <p className="text-sm text-slate-500">Tedarikçi borçlanmaları</p>
                    </CardHeader>
                    <CardContent className="overflow-x-auto">
                        {invoicesLoading ? (
                            <div className="text-center py-8 text-slate-400">Yükleniyor...</div>
                        ) : invoices?.length > 0 ? (
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Tarih</TableHead>
                                        <TableHead>Tedarikçi</TableHead>
                                        <TableHead className="text-right">Tutar</TableHead>
                                        <TableHead></TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {invoices.slice(0, 10).map((inv: any) => (
                                        <TableRow key={inv.id}>
                                            <TableCell className="text-sm">
                                                {new Date(inv.invoiceDate).toLocaleDateString('tr-TR')}
                                            </TableCell>
                                            <TableCell className="font-medium">{inv.supplier?.title}</TableCell>
                                            <TableCell className="text-right font-mono text-orange-600">
                                                {Number(inv.totalAmount).toLocaleString('tr-TR', { minimumFractionDigits: 2 })} {inv.currency?.code}
                                            </TableCell>
                                            <TableCell>
                                                <Link href={`/finance/invoices/${inv.id}/edit`}>
                                                    <Button variant="ghost" size="icon" className="h-8 w-8">
                                                        <Pencil className="h-4 w-4" />
                                                    </Button>
                                                </Link>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        ) : (
                            <div className="text-center py-8 text-slate-400 border border-dashed rounded-md bg-white">
                                Henüz fatura girişi yapılmadı.
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Son Satış Fişleri */}
                <Card className="border-l-4 border-l-blue-500">
                    <CardHeader>
                        <CardTitle className="text-xl font-semibold text-slate-800">Son Satış Fişleri</CardTitle>
                        <p className="text-sm text-slate-500">Müşteri alacaklanmaları</p>
                    </CardHeader>
                    <CardContent className="overflow-x-auto">
                        {salesLoading ? (
                            <div className="text-center py-8 text-slate-400">Yükleniyor...</div>
                        ) : sales?.length > 0 ? (
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Tarih</TableHead>
                                        <TableHead>Müşteri</TableHead>
                                        <TableHead className="text-right">Tutar</TableHead>
                                        <TableHead></TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {sales.slice(0, 10).map((sale: any) => (
                                        <TableRow key={sale.id}>
                                            <TableCell className="text-sm">
                                                {new Date(sale.slipDate).toLocaleDateString('tr-TR')}
                                            </TableCell>
                                            <TableCell className="font-medium">{sale.customer?.title}</TableCell>
                                            <TableCell className="text-right font-mono text-blue-600">
                                                {Number(sale.totalAmount).toLocaleString('tr-TR', { minimumFractionDigits: 2 })} {sale.currency?.code}
                                            </TableCell>
                                            <TableCell>
                                                <Link href={`/finance/sales/${sale.id}/edit`}>
                                                    <Button variant="ghost" size="icon" className="h-8 w-8">
                                                        <Pencil className="h-4 w-4" />
                                                    </Button>
                                                </Link>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        ) : (
                            <div className="text-center py-8 text-slate-400 border border-dashed rounded-md bg-white">
                                Henüz satış girişi yapılmadı.
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}
