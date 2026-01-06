'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useQuery, useMutation } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Trash2, Plus, Save, ArrowLeft } from 'lucide-react'

// Cari Listesi (Sadece Tedarikçiler)
async function getSuppliers() {
    const res = await fetch('/api/caries?type=SUPPLIER')
    if (!res.ok) throw new Error('Tedarikçiler çekilemedi')
    return res.json()
}

// Fatura Kaydetme
async function createInvoice(data: any) {
    const res = await fetch('/api/invoices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
    })
    // Hata detayını al
    if (!res.ok) {
        const errorData = await res.json()
        throw new Error(errorData.error || 'Fatura oluşturulamadı')
    }
    return res.json()
}

export default function NewInvoicePage() {
    const router = useRouter()

    // Form State
    const [supplierId, setSupplierId] = useState('')
    const [invoiceDate, setInvoiceDate] = useState(new Date().toISOString().split('T')[0])
    const [currencyCode, setCurrencyCode] = useState('TL')
    const [discountRate, setDiscountRate] = useState(0)
    const [items, setItems] = useState([
        { stockCode: '', productName: '', quantity: 1, unitPrice: 0, vatRate: 20 }
    ])

    const { data: suppliers } = useQuery({
        queryKey: ['suppliers'],
        queryFn: getSuppliers
    })

    const createMutation = useMutation({
        mutationFn: createInvoice,
        onSuccess: () => {
            alert('Fatura başarıyla kaydedildi!')
            router.push('/finance/invoices')
        },
        onError: (error) => {
            alert('Hata: ' + error.message)
        }
    })

    // Hesaplamalar
    const calculateTotals = () => {
        let subTotal = 0
        let totalDiscount = 0
        let totalVat = 0
        let grandTotal = 0

        items.forEach(item => {
            const baseAmount = item.quantity * item.unitPrice
            const discountAmount = baseAmount * (discountRate / 100)
            const discountedBase = baseAmount - discountAmount
            const vatAmount = discountedBase * (item.vatRate / 100)

            subTotal += baseAmount
            totalDiscount += discountAmount
            totalVat += vatAmount
            grandTotal += discountedBase + vatAmount
        })

        return { subTotal, totalDiscount, totalVat, grandTotal }
    }

    const handleAddItem = () => {
        setItems([...items, { stockCode: '', productName: '', quantity: 1, unitPrice: 0, vatRate: 20 }])
    }

    const handleRemoveItem = (index: number) => {
        const newItems = [...items]
        newItems.splice(index, 1)
        setItems(newItems)
    }

    const handleItemChange = (index: number, field: string, value: any) => {
        const newItems: any = [...items]
        newItems[index][field] = value
        setItems(newItems)
    }

    const handleSubmit = () => {
        if (!supplierId) {
            alert('Lütfen bir tedarikçi seçin')
            return
        }
        // Validasyon: Kalemlerin dolu olması
        const validItems = items.filter(i => i.productName.trim() !== '' && i.quantity > 0 && i.unitPrice > 0)
        if (validItems.length === 0) {
            alert('Lütfen en az bir geçerli ürün kalemi giriniz.')
            return
        }

        const payload = {
            supplierId: parseInt(supplierId),
            invoiceDate: invoiceDate,
            currencyCode: currencyCode,
            discountRate: discountRate,
            items: validItems.map(item => ({
                stockCode: item.stockCode,
                productName: item.productName,
                quantity: item.quantity,
                unitPrice: item.unitPrice,
                vatRate: item.vatRate
            }))
        }

        createMutation.mutate(payload)
    }

    return (
        <div className="space-y-6 pb-20">
            <div className="flex items-center gap-4">
                <Button variant="outline" size="icon" onClick={() => router.back()}>
                    <ArrowLeft className="h-4 w-4" />
                </Button>
                <div>
                    <h2 className="text-3xl font-bold tracking-tight">Yeni Alış Faturası</h2>
                    <p className="text-muted-foreground">Tedarikçiden alınan ürün/hizmet girişi</p>
                </div>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
                <Card>
                    <CardHeader>
                        <CardTitle>Fatura Bilgileri</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid gap-2">
                            <Label>Tedarikçi</Label>
                            <select
                                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                value={supplierId}
                                onChange={(e) => setSupplierId(e.target.value)}
                            >
                                <option value="">Seçiniz</option>
                                {suppliers?.map((s: any) => (
                                    <option key={s.id} value={s.id}>
                                        {s.title} ({s.defaultCurrency?.code})
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="grid gap-2">
                                <Label>Fatura Tarihi</Label>
                                <Input
                                    type="date"
                                    value={invoiceDate}
                                    onChange={(e) => setInvoiceDate(e.target.value)}
                                />
                            </div>
                            <div className="grid gap-2">
                                <Label>Para Birimi</Label>
                                <select
                                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                                    value={currencyCode}
                                    onChange={(e) => setCurrencyCode(e.target.value)}
                                >
                                    <option value="TL">TL</option>
                                    <option value="USD">USD</option>
                                </select>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card className="bg-slate-50 border-dashed">
                    <CardHeader>
                        <CardTitle>Özet</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="flex flex-col w-full space-y-3">
                            <div className="flex flex-col gap-1">
                                <Label className="text-xs text-muted-foreground">İskonto Oranı (%)</Label>
                                <Input
                                    type="number"
                                    min="0"
                                    max="100"
                                    step="1"
                                    value={discountRate}
                                    onChange={(e) => setDiscountRate(parseFloat(e.target.value) || 0)}
                                    className="h-8"
                                />
                            </div>
                            <div className="space-y-1 text-sm pt-2 border-t">
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">Ara Toplam:</span>
                                    <span>{calculateTotals().subTotal.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} {currencyCode}</span>
                                </div>
                                <div className="flex justify-between text-red-500">
                                    <span>İskonto:</span>
                                    <span>-{calculateTotals().totalDiscount.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} {currencyCode}</span>
                                </div>
                                <div className="flex justify-between text-blue-600">
                                    <span>KDV Toplam:</span>
                                    <span>+{calculateTotals().totalVat.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} {currencyCode}</span>
                                </div>
                                <div className="flex justify-between font-bold text-lg pt-2 border-t">
                                    <span>Genel Toplam:</span>
                                    <span>{calculateTotals().grandTotal.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} {currencyCode}</span>
                                </div>
                            </div>
                            <p className="text-xs text-slate-400 text-center pt-2">
                                * Kur bilgisi işlem anında sabitlenir.
                            </p>
                        </div>
                    </CardContent>
                </Card>
            </div>

            <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                    <CardTitle>Ürün / Hizmet Kalemleri</CardTitle>
                    <Button onClick={handleAddItem} variant="secondary" size="sm">
                        <Plus className="mr-2 h-4 w-4" /> Satır Ekle
                    </Button>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="w-[15%]">Stok Kodu</TableHead>
                                <TableHead className="w-[20%]">Ürün / Hizmet Adı</TableHead>
                                <TableHead className="w-[15%]">Miktar</TableHead>
                                <TableHead className="w-[15%]">Birim Fiyat</TableHead>
                                <TableHead className="w-[15%]">KDV (%)</TableHead>
                                <TableHead className="w-[15%] text-right">Tutar</TableHead>
                                <TableHead className="w-[5%]"></TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {items.map((item, index) => (
                                <TableRow key={index}>
                                    <TableCell>
                                        <Input
                                            placeholder="Stok Kodu"
                                            value={item.stockCode}
                                            onChange={(e) => handleItemChange(index, 'stockCode', e.target.value)}
                                        />
                                    </TableCell>
                                    <TableCell>
                                        <Input
                                            placeholder="Örn: Sunucu Bakım Bedeli"
                                            value={item.productName}
                                            onChange={(e) => handleItemChange(index, 'productName', e.target.value)}
                                        />
                                    </TableCell>
                                    <TableCell>
                                        <Input
                                            type="number"
                                            min="1"
                                            value={item.quantity}
                                            onChange={(e) => handleItemChange(index, 'quantity', parseFloat(e.target.value))}
                                        />
                                    </TableCell>
                                    <TableCell>
                                        <Input
                                            type="number"
                                            min="0"
                                            step="0.01"
                                            value={item.unitPrice}
                                            onChange={(e) => handleItemChange(index, 'unitPrice', parseFloat(e.target.value))}
                                        />
                                    </TableCell>
                                    <TableCell>
                                        <select
                                            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                                            value={item.vatRate}
                                            onChange={(e) => handleItemChange(index, 'vatRate', parseInt(e.target.value))}
                                        >
                                            <option value="0">%0</option>
                                            <option value="1">%1</option>
                                            <option value="10">%10</option>
                                            <option value="20">%20</option>
                                        </select>
                                    </TableCell>
                                    <TableCell className="text-right font-medium">
                                        <Input
                                            type="number"
                                            min="0"
                                            step="0.01"
                                            className="text-right font-medium"
                                            value={(() => {
                                                const base = item.quantity * item.unitPrice
                                                const disc = base * (discountRate / 100)
                                                const vat = (base - disc) * (item.vatRate / 100)
                                                // Virgülden sonra 2 hane gösterimi için, ama input değeri number olmalı
                                                // Hassas hesaplama için raw değeri kullanıp yuvarlama yapabiliriz
                                                return (base - disc + vat).toFixed(2)
                                            })()}
                                            onChange={(e) => {
                                                const newTotal = parseFloat(e.target.value) || 0
                                                // Reverse Calculation:
                                                // Total = (Qty * Price) * (1 - Disc%) * (1 + VAT%)
                                                // Price = Total / (Qty * (1 - Disc%) * (1 + VAT%))

                                                const quantity = item.quantity || 1
                                                const discMultiplier = 1 - (discountRate / 100)
                                                const vatMultiplier = 1 + (item.vatRate / 100)
                                                const denominator = quantity * discMultiplier * vatMultiplier

                                                if (denominator !== 0) {
                                                    const newUnitPrice = newTotal / denominator
                                                    handleItemChange(index, 'unitPrice', newUnitPrice)
                                                }
                                            }}
                                        />
                                    </TableCell>
                                    <TableCell>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="text-red-500 hover:text-red-700 hover:bg-red-50"
                                            onClick={() => handleRemoveItem(index)}
                                            disabled={items.length === 1}
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            <div className="flex justify-end gap-4">
                <Button variant="outline" onClick={() => router.back()}>İptal</Button>
                <Button size="lg" onClick={handleSubmit} disabled={createMutation.isPending}>
                    <Save className="mr-2 h-4 w-4" />
                    {createMutation.isPending ? 'Kaydediliyor...' : 'Faturayı Kaydet'}
                </Button>
            </div>
        </div>
    )
}
