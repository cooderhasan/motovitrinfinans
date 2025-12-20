'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ArrowDownLeft, ArrowUpRight, CreditCard, Banknote, Building } from 'lucide-react'

// Carileri Çekme
async function getCaries(type?: string) {
    const url = type ? `/api/caries?type=${type}` : '/api/caries'
    const res = await fetch(url)
    if (!res.ok) throw new Error('Cariler çekilemedi')
    return res.json()
}

// Ödeme Kaydetme
async function createPayment(data: any) {
    const res = await fetch('/api/payments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
    })
    if (!res.ok) throw new Error('İşlem kaydedilemedi')
    return res.json()
}

export default function PaymentsPage() {
    const queryClient = useQueryClient()
    const [submitting, setSubmitting] = useState(false)

    // Form States
    const [formData, setFormData] = useState({
        cariId: '',
        amount: '',
        currencyCode: 'TL',
        method: 'CASH',
        date: new Date().toISOString().split('T')[0]
    })

    // Fetch Lists
    const { data: customers } = useQuery({ queryKey: ['customers'], queryFn: () => getCaries('CUSTOMER') })
    const { data: suppliers } = useQuery({ queryKey: ['suppliers'], queryFn: () => getCaries('SUPPLIER') })
    const { data: employees } = useQuery({ queryKey: ['employees'], queryFn: () => getCaries('EMPLOYEE') })

    // Mutation
    const mutation = useMutation({
        mutationFn: createPayment,
        onSuccess: () => {
            alert('İşlem başarıyla kaydedildi.')
            setFormData({ ...formData, amount: '', cariId: '' })
            queryClient.invalidateQueries({ queryKey: ['dashboard'] }) // Dashboard bakiyeleri güncellensin
        },
        onError: (err) => {
            alert('Hata: ' + err.message)
        },
        onSettled: () => setSubmitting(false)
    })

    const handleSubmit = (type: 'COLLECTION' | 'PAYMENT') => {
        if (!formData.cariId || !formData.amount) {
            alert('Lütfen Cari ve Tutar bilgilerini doldurunuz.')
            return
        }

        setSubmitting(true)
        mutation.mutate({
            cariId: parseInt(formData.cariId),
            paymentType: type,
            method: formData.method,
            amount: parseFloat(formData.amount),
            currencyCode: formData.currencyCode,
            paymentDate: formData.date
        })
    }

    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-3xl font-bold tracking-tight">Kasa & Ödemeler</h2>
                <p className="text-muted-foreground">Tahsilat ve tediye işlemlerinizi yönetin.</p>
            </div>

            <Tabs defaultValue="collection" className="w-full">
                <TabsList className="grid w-full grid-cols-2 lg:w-[400px]">
                    <TabsTrigger value="collection">Tahsilat (Giriş)</TabsTrigger>
                    <TabsTrigger value="payment">Ödeme (Çıkış)</TabsTrigger>
                </TabsList>

                {/* TAHSİLAT TABI */}
                <TabsContent value="collection">
                    <Card className="border-emerald-200 bg-emerald-50/30">
                        <CardHeader>
                            <CardTitle className="flex items-center text-emerald-700">
                                <ArrowDownLeft className="mr-2 h-5 w-5" /> Tahsilat İşlemi
                            </CardTitle>
                            <CardDescription>
                                Müşteriden nakit veya banka yoluyla ödeme al.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="grid gap-4 md:grid-cols-2">
                                <div className="space-y-2">
                                    <Label>Müşteri Seçimi</Label>
                                    <select
                                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                                        value={formData.cariId}
                                        onChange={(e) => setFormData({ ...formData, cariId: e.target.value })}
                                    >
                                        <option value="">Seçiniz</option>
                                        {customers?.map((c: any) => (
                                            <option key={c.id} value={c.id}>{c.title}</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="space-y-2">
                                    <Label>Tarih</Label>
                                    <Input type="date" value={formData.date} onChange={(e) => setFormData({ ...formData, date: e.target.value })} />
                                </div>
                            </div>

                            <div className="grid gap-4 md:grid-cols-3">
                                <div className="space-y-2">
                                    <Label>Tutar</Label>
                                    <Input
                                        type="number"
                                        step="0.01"
                                        placeholder="0.00"
                                        value={formData.amount}
                                        onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>Para Birimi</Label>
                                    <select
                                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                                        value={formData.currencyCode}
                                        onChange={(e) => setFormData({ ...formData, currencyCode: e.target.value })}
                                    >
                                        <option value="TL">TL</option>
                                        <option value="USD">USD</option>
                                    </select>
                                </div>
                                <div className="space-y-2">
                                    <Label>Ödeme Yöntemi</Label>
                                    <select
                                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                                        value={formData.method}
                                        onChange={(e) => setFormData({ ...formData, method: e.target.value })}
                                    >
                                        <option value="CASH">Nakit</option>
                                        <option value="BANK">Banka / POS</option>
                                        <option value="TRANSFER">Havale / EFT</option>
                                    </select>
                                </div>
                            </div>

                            <Button
                                className="w-full bg-emerald-600 hover:bg-emerald-700 mt-4"
                                onClick={() => handleSubmit('COLLECTION')}
                                disabled={submitting}
                            >
                                {submitting ? 'Kaydediliyor...' : 'Tahsilatı Kaydet'}
                            </Button>

                        </CardContent>
                    </Card>
                </TabsContent>

                {/* ÖDEME TABI */}
                <TabsContent value="payment">
                    <Card className="border-rose-200 bg-rose-50/30">
                        <CardHeader>
                            <CardTitle className="flex items-center text-rose-700">
                                <ArrowUpRight className="mr-2 h-5 w-5" /> Ödeme İşlemi
                            </CardTitle>
                            <CardDescription>
                                Tedarikçiye veya Personele ödeme yap.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="grid gap-4 md:grid-cols-2">
                                <div className="space-y-2">
                                    <Label>Cari Seçimi (Tedarikçi / Personel)</Label>
                                    <select
                                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                                        value={formData.cariId}
                                        onChange={(e) => setFormData({ ...formData, cariId: e.target.value })}
                                    >
                                        <option value="">Seçiniz</option>
                                        <optgroup label="Tedarikçiler">
                                            {suppliers?.map((c: any) => (
                                                <option key={c.id} value={c.id}>{c.title}</option>
                                            ))}
                                        </optgroup>
                                        <optgroup label="Personeller">
                                            {employees?.map((c: any) => (
                                                <option key={c.id} value={c.id}>{c.title}</option>
                                            ))}
                                        </optgroup>
                                    </select>
                                </div>
                                <div className="space-y-2">
                                    <Label>Tarih</Label>
                                    <Input type="date" value={formData.date} onChange={(e) => setFormData({ ...formData, date: e.target.value })} />
                                </div>
                            </div>

                            <div className="grid gap-4 md:grid-cols-3">
                                <div className="space-y-2">
                                    <Label>Tutar</Label>
                                    <Input
                                        type="number"
                                        step="0.01"
                                        placeholder="0.00"
                                        value={formData.amount}
                                        onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>Para Birimi</Label>
                                    <select
                                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                                        value={formData.currencyCode}
                                        onChange={(e) => setFormData({ ...formData, currencyCode: e.target.value })}
                                    >
                                        <option value="TL">TL</option>
                                        <option value="USD">USD</option>
                                    </select>
                                </div>
                                <div className="space-y-2">
                                    <Label>Ödeme Yöntemi</Label>
                                    <select
                                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                                        value={formData.method}
                                        onChange={(e) => setFormData({ ...formData, method: e.target.value })}
                                    >
                                        <option value="CASH">Nakit</option>
                                        <option value="BANK">Banka</option>
                                        <option value="TRANSFER">Havale / EFT</option>
                                    </select>
                                </div>
                            </div>

                            <Button
                                className="w-full bg-rose-600 hover:bg-rose-700 mt-4"
                                onClick={() => handleSubmit('PAYMENT')}
                                disabled={submitting}
                            >
                                {submitting ? 'Kaydediliyor...' : 'Ödemeyi Kaydet'}
                            </Button>

                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    )
}
