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

// Cari Listesi (Sadece Müşteriler)
async function getCustomers() {
    const res = await fetch('/api/caries?type=CUSTOMER')
    if (!res.ok) throw new Error('Müşteriler çekilemedi')
    return res.json()
}

// Satış Kaydetme
async function createSale(data: any) {
    const res = await fetch('/api/sales', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
    })
    if (!res.ok) {
        const errorData = await res.json()
        throw new Error(errorData.error || 'Satış oluşturulamadı')
    }
    return res.json()
}

export default function NewSalePage() {
    const router = useRouter()

    // Form State
    const [customerId, setCustomerId] = useState('')
    const [slipDate, setSlipDate] = useState(new Date().toISOString().split('T')[0])
    const [currencyCode, setCurrencyCode] = useState('TL')
    const [items, setItems] = useState([
        { stockCode: '', productName: '', quantity: 1, unitPrice: 0, vatRate: 20 }
    ])

    const { data: customers } = useQuery({
        queryKey: ['customers'],
        queryFn: getCustomers
    })

    const createMutation = useMutation({
        mutationFn: createSale,
        onSuccess: () => {
            alert('Satış fişi başarıyla kaydedildi!')
            router.push('/finance/invoices')
        },
        onError: (error) => {
            alert('Hata: ' + error.message)
        }
    })

    // Hesaplamalar
    const calculateTotal = () => {
        return items.reduce((acc, item) => acc + (item.quantity * item.unitPrice), 0)
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
        if (!customerId) {
            alert('Lütfen bir müşteri seçin')
            return
        }
        const validItems = items.filter(i => i.productName.trim() !== '' && i.quantity > 0 && i.unitPrice > 0)
        if (validItems.length === 0) {
            alert('Lütfen en az bir geçerli ürün kalemi giriniz.')
            return
        }

        const payload = {
            customerId: parseInt(customerId),
            slipDate: slipDate,
            currencyCode: currencyCode,
            items: validItems
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
                    <h2 className="text-3xl font-bold tracking-tight text-blue-600">Yeni Satış Fişi</h2>
                    <p className="text-muted-foreground">Müşteriye yapılan satış işlemi</p>
                </div>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
                <Card>
                    <CardHeader>
                        <CardTitle>Satış Bilgileri</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid gap-2">
                            <Label>Müşteri</Label>
                            <select
                                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                value={customerId}
                                onChange={(e) => setCustomerId(e.target.value)}
                            >
                                <option value="">Seçiniz</option>
                                {customers?.map((c: any) => (
                                    <option key={c.id} value={c.id}>
                                        {c.title} ({c.defaultCurrency?.code})
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="grid gap-2">
                                <Label>Fiş Tarihi</Label>
                                <Input
                                    type="date"
                                    value={slipDate}
                                    onChange={(e) => setSlipDate(e.target.value)}
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

                <Card className="bg-blue-50 border-dashed border-blue-200">
                    <CardHeader>
                        <CardTitle>Özet</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="flex flex-col items-center justify-center h-full space-y-2">
                            <span className="text-sm text-muted-foreground">Genel Toplam</span>
                            <span className="text-4xl font-bold text-blue-800">
                                {calculateTotal().toLocaleString('tr-TR', { minimumFractionDigits: 2 })} {currencyCode}
                            </span>
                            <p className="text-xs text-blue-400 text-center max-w-[200px]">
                                * Kur bilgisi işlem kaydedildiği anda sabitlenecektir.
                            </p>
                        </div>
                    </CardContent>
                </Card>
            </div>

            <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                    <CardTitle>Satış Kalemleri</CardTitle>
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
                                            placeholder="Örn: Yazılım Geliştirme Hizmeti"
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
                                    <TableCell>
                                        <Input
                                            type="number"
                                            min="0"
                                            step="0.01"
                                            className="text-right font-medium"
                                            value={Math.round((item.quantity * item.unitPrice) * 100) / 100}
                                            onChange={(e) => {
                                                const newTotal = parseFloat(e.target.value) || 0
                                                const quantity = item.quantity || 1
                                                if (quantity !== 0) {
                                                    const newUnitPrice = newTotal / quantity
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
                <Button size="lg" onClick={handleSubmit} disabled={createMutation.isPending} className="bg-blue-600 hover:bg-blue-700">
                    <Save className="mr-2 h-4 w-4" />
                    {createMutation.isPending ? 'Kaydediliyor...' : 'Satışı Kaydet'}
                </Button>
            </div>
        </div>
    )
}
