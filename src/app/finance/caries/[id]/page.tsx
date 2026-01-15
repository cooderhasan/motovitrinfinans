'use client'

import { useState, use } from 'react'
import { useRouter } from 'next/navigation'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ArrowLeft, Wallet, TrendingUp, TrendingDown, Calendar, FileText, Plus, Trash2, Pencil } from 'lucide-react'

// API functions
async function deletePayment(id: number) {
    const res = await fetch(`/api/payments/${id}`, {
        method: 'DELETE'
    })
    if (!res.ok) {
        let errorMessage = 'Silme işlemi başarısız';
        try {
            const err = await res.json();
            if (err.error) errorMessage = err.error;
        } catch (e) { }
        throw new Error(errorMessage);
    }
    return res.json()
}

async function updatePayment(id: number, data: any) {
    const res = await fetch(`/api/payments/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
    })

    if (!res.ok) {
        let errorMessage = 'Güncelleme işlemi başarısız';
        try {
            const err = await res.json();
            if (err.error) errorMessage = err.error;
        } catch (e) { }
        throw new Error(errorMessage);
    }
    return res.json()
}
async function getCari(id: string) {
    const res = await fetch(`/api/caries/${id}`)
    if (!res.ok) throw new Error('Cari bilgileri alınamadı')
    return res.json()
}

async function getStatement(cariId: string, currencyCode: string = 'TL') {
    const res = await fetch(`/api/reports/statement`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cariId, currencyCode })
    })
    if (!res.ok) throw new Error('Ekstre alınamadı')
    return res.json()
}

async function createPayment(data: any) {
    const res = await fetch('/api/payments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
    })

    if (!res.ok) {
        let errorMessage = 'İşlem kaydedilemedi';
        try {
            const err = await res.json();
            if (err.error) errorMessage = err.error;
            if (err.details) errorMessage += ` (${err.details})`;
        } catch (e) {
            const text = await res.text().catch(() => '');
            errorMessage = `Sunucu Hatası (${res.status}): ${text.substring(0, 50)}...`;
        }
        throw new Error(errorMessage);
    }
    return res.json()
}

export default function CariDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params)
    const router = useRouter()
    const queryClient = useQueryClient()

    // Dialog States
    const [transactionDialogOpen, setTransactionDialogOpen] = useState(false)
    const [transactionType, setTransactionType] = useState<'DEBIT' | 'CREDIT'>('DEBIT')

    // Let's use the API's paymentType: 'COLLECTION' | 'PAYMENT'
    const [actionType, setActionType] = useState<'COLLECTION' | 'PAYMENT'>('COLLECTION')
    const [form, setForm] = useState({
        amount: '',
        description: '',
        date: new Date().toISOString().split('T')[0]
    })
    const [submitting, setSubmitting] = useState(false)
    const [editingId, setEditingId] = useState<number | null>(null)
    const [deletingId, setDeletingId] = useState<number | null>(null)

    // Data Fetching
    const { data: cari, isLoading: loadingCari } = useQuery({
        queryKey: ['cari', id],
        queryFn: () => getCari(id)
    })

    const currencyCode = cari?.defaultCurrency?.code || 'TL'

    const { data: statementData, isLoading: loadingStatement } = useQuery({
        queryKey: ['statement', id, 'ALL'],
        queryFn: () => getStatement(id, 'ALL'), // Hepsini getir ki kur hatası varsa görelim
        enabled: !!cari
    })

    const handleTransaction = (type: 'COLLECTION' | 'PAYMENT') => {
        setActionType(type)
        setEditingId(null)
        setForm({ amount: '', description: '', date: new Date().toISOString().split('T')[0] })
        setTransactionDialogOpen(true)
    }

    const handleEdit = (transaction: any) => {
        // Determine type based on debit/credit or database info if available, 
        // but here we can infer: 
        // Collection = Credit > 0 (Customer pays us, Balance goes DOWN/NEGATIVE direction usually or just Credit entry)
        // Payment = Debit > 0
        // Let's stick to the logic used in handleTransaction helper or API.

        // API: COLLECTION -> CREDIT, PAYMENT -> DEBIT
        const type = transaction.credit > 0 ? 'COLLECTION' : 'PAYMENT'

        setActionType(type)
        setEditingId(transaction.sourceId)
        setForm({
            amount: (transaction.credit > 0 ? transaction.credit : transaction.debit).toString(),
            description: transaction.description,
            date: new Date(transaction.transactionDate).toISOString().split('T')[0]
        })
        setTransactionDialogOpen(true)
    }

    const handleDelete = async (sourceId: number) => {
        if (!window.confirm('Bu işlemi silmek istediğinize emin misiniz?')) return

        setDeletingId(sourceId)
        try {
            await deletePayment(sourceId)
            queryClient.invalidateQueries({ queryKey: ['statement', id] })
            queryClient.invalidateQueries({ queryKey: ['cari', id] })
            alert('İşlem silindi')
        } catch (error: any) {
            alert('Hata: ' + error.message)
        } finally {
            setDeletingId(null)
        }
    }

    const handleSubmit = async () => {
        if (!form.amount || parseFloat(form.amount) <= 0) {
            alert('Geçerli bir tutar giriniz')
            return
        }

        setSubmitting(true)
        try {
            if (editingId) {
                // UPDATE logic
                await updatePayment(editingId, {
                    amount: parseFloat(form.amount),
                    description: form.description,
                    paymentDate: form.date
                })
                alert('İşlem güncellendi')
            } else {
                // CREATE logic
                await createPayment({
                    cariId: parseInt(id),
                    paymentType: actionType,
                    method: 'CASH',
                    amount: parseFloat(form.amount),
                    currencyCode: currencyCode,
                    paymentDate: form.date,
                    description: form.description
                })
                alert('İşlem başarıyla kaydedildi')
            }
            setTransactionDialogOpen(false)
            queryClient.invalidateQueries({ queryKey: ['statement', id] })
            queryClient.invalidateQueries({ queryKey: ['cari', id] })
        } catch (error: any) {
            alert('Hata: ' + error.message)
        } finally {
            setSubmitting(false)
        }
    }

    if (loadingCari) return <div className="p-8">Yükleniyor...</div>
    if (!cari) return <div className="p-8">Cari bulunamadı</div>

    const transactions = statementData?.statement || []
    const lastBalance = transactions.length > 0 ? transactions[transactions.length - 1].balance : (cari.openingBalance || 0)

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center gap-4">
                <Button variant="ghost" size="icon" onClick={() => router.back()}>
                    <ArrowLeft className="h-4 w-4" />
                </Button>
                <div>
                    <h2 className="text-2xl font-bold tracking-tight">{cari.title}</h2>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 font-medium">
                            {cari.type === 'CUSTOMER' ? 'Müşteri' : cari.type === 'SUPPLIER' ? 'Tedarikçi' : 'Personel'}
                        </span>
                        <span>•</span>
                        <span>{currencyCode}</span>
                    </div>
                </div>
            </div>

            {/* Summary Cards */}
            <div className="grid gap-4 md:grid-cols-3">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Güncel Bakiye</CardTitle>
                        <Wallet className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className={`text-2xl font-bold ${lastBalance > 0 ? 'text-rose-600' : lastBalance < 0 ? 'text-emerald-600' : ''}`}>
                            {lastBalance.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} {currencyCode}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                            {lastBalance > 0 ? 'Borçlu' : 'Alacaklı'}
                            {/* System logic: 
                                + Balance = Debtor (Borçlu) usually. 
                                - Balance = Creditor (Alacaklı).
                                Let's stick to just the numbers and colors to avoid confusion unless absolutely sure of the system's sign convention used elsewhere. 
                                Looking at page.tsx: `(cari.currentBalance || 0) > 0 ? 'text-rose-600'`
                                Usually Red = Debt/Negative for us? Or Red = User owes us?
                                In accounting softwares:
                                Customer Debit Balance (Positive) = Customer owes us. 
                                Supplier Credit Balance (Negative) = We owe supplier.
                             */}
                        </p>
                    </CardContent>
                </Card>

                {/* Actions */}
                <Card className="md:col-span-2 flex flex-col md:flex-row items-center p-6 bg-slate-50 border-dashed gap-4">
                    <div className="w-full md:w-auto flex-1" />
                    <div className="flex flex-col md:flex-row gap-3 w-full md:w-auto">
                        <Button
                            className="w-full md:w-auto bg-emerald-600 hover:bg-emerald-700 text-white"
                            onClick={() => handleTransaction('COLLECTION')}
                        >
                            <TrendingDown className="mr-2 h-4 w-4" />
                            Tahsilat Ekle (Alacak Düş)
                        </Button>
                        <Button
                            className="w-full md:w-auto bg-rose-600 hover:bg-rose-700 text-white"
                            onClick={() => handleTransaction('PAYMENT')}
                        >
                            <TrendingUp className="mr-2 h-4 w-4" />
                            Ödeme Yap (Borç Düş/Öde)
                        </Button>
                    </div>
                </Card>
            </div>

            {/* Transaction History */}
            <Card>
                <CardHeader>
                    <CardTitle>Hesap Hareketleri</CardTitle>
                    <CardDescription>Son işlemler ve ekstre detayları</CardDescription>
                </CardHeader>
                <CardContent>
                    {loadingStatement ? (
                        <div className="py-8 text-center">Yükleniyor...</div>
                    ) : (
                        <div className="rounded-md border overflow-x-auto">
                            <Table>
                                <TableHeader>
                                    <TableRow className="bg-slate-50">
                                        <TableHead>Tarih</TableHead>
                                        <TableHead>Açıklama</TableHead>
                                        <TableHead className="text-right text-rose-600">Borç</TableHead>
                                        <TableHead className="text-right text-emerald-600">Alacak</TableHead>
                                        <TableHead className="text-right">Bakiye</TableHead>
                                        <TableHead className="w-[100px]"></TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {transactions.map((row: any, i: number) => (
                                        <TableRow key={i}>
                                            <TableCell>{new Date(row.transactionDate).toLocaleDateString('tr-TR')}</TableCell>
                                            <TableCell>{row.description || '-'}</TableCell>
                                            <TableCell className="text-right font-mono text-rose-600">
                                                {row.debit > 0 ? (
                                                    <span>{row.debit.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} <span className="text-xs text-muted-foreground">{row.currency?.code}</span></span>
                                                ) : '-'}
                                            </TableCell>
                                            <TableCell className="text-right font-mono text-emerald-600">
                                                {row.credit > 0 ? (
                                                    <span>{row.credit.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} <span className="text-xs text-muted-foreground">{row.currency?.code}</span></span>
                                                ) : '-'}
                                            </TableCell>
                                            <TableCell className="text-right font-mono font-bold">
                                                {row.balance.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
                                            </TableCell>
                                            <TableCell>
                                                {row.source === 'payment' && (
                                                    <div className="flex justify-end gap-2">
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            className="h-8 w-8 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                                                            onClick={() => handleEdit(row)}
                                                        >
                                                            <Pencil className="h-4 w-4" />
                                                        </Button>
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50"
                                                            onClick={() => handleDelete(row.sourceId)}
                                                            disabled={deletingId === row.sourceId}
                                                        >
                                                            {deletingId === row.sourceId ? (
                                                                <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                                                            ) : (
                                                                <Trash2 className="h-4 w-4" />
                                                            )}
                                                        </Button>
                                                    </div>
                                                )}
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                    {transactions.length === 0 && (
                                        <TableRow>
                                            <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                                                Kayıt bulunamadı.
                                            </TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Quick Action Dialog */}
            <Dialog open={transactionDialogOpen} onOpenChange={setTransactionDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>
                            {editingId
                                ? 'İşlemi Düzenle'
                                : (actionType === 'COLLECTION' ? 'Tahsilat Ekle (Alacak)' : 'Ödeme Yap (Borç)')
                            }
                        </DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="grid gap-2">
                            <Label>Tutar ({currencyCode})</Label>
                            <Input
                                type="number"
                                step="0.01"
                                placeholder="0.00"
                                value={form.amount}
                                onChange={(e) => setForm({ ...form, amount: e.target.value })}
                            />
                        </div>
                        <div className="grid gap-2">
                            <Label>Açıklama</Label>
                            <Input
                                placeholder="İşlem açıklaması..."
                                value={form.description}
                                onChange={(e) => setForm({ ...form, description: e.target.value })}
                            />
                        </div>
                        <div className="grid gap-2">
                            <Label>Tarih</Label>
                            <Input
                                type="date"
                                value={form.date}
                                onChange={(e) => setForm({ ...form, date: e.target.value })}
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setTransactionDialogOpen(false)}>İptal</Button>
                        <Button
                            onClick={handleSubmit}
                            disabled={submitting}
                            className={actionType === 'COLLECTION' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-rose-600 hover:bg-rose-700'}
                        >
                            {submitting ? 'Kaydediliyor...' : 'Kaydet'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}
