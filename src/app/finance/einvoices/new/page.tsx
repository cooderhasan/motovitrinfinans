'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { UserCheck, Send, Plus, Trash2, FileText, ShoppingCart } from 'lucide-react'

export default function NewEInvoicePage() {
    const router = useRouter()

    // Form States
    const [recipient, setRecipient] = useState({
        vkn: '',
        title: '',
        taxOffice: '',
        address: '',
        city: '',
        district: '',
        country: 'Türkiye',
        email: ''
    })

    const [invoiceSettings, setInvoiceSettings] = useState({
        profile: '', // TICARIFATURA, TEMELFATURA, EARSIVFATURA
        type: 'SATIS', // SATIS, IADE
        date: new Date().toISOString().split('T')[0],
        currencyCode: 'TL'
    })

    const [items, setItems] = useState<any[]>([])

    // Status States
    const [checkingUser, setCheckingUser] = useState(false)
    const [isVknVerified, setIsVknVerified] = useState(false)
    const [userType, setUserType] = useState<'E-INVOICE' | 'E-ARCHIVE' | null>(null)
    const [submitting, setSubmitting] = useState(false)

    // Check User Logic
    const handleCheckUser = async () => {
        if (!recipient.vkn || recipient.vkn.length < 10) {
            alert('Lütfen geçerli bir VKN/TCKN giriniz')
            return
        }

        setCheckingUser(true)
        try {
            const res = await fetch(`/api/finance/einvoice/check-user?vkn=${recipient.vkn}`)
            const data = await res.json()

            if (!res.ok) throw new Error(data.error || 'Sorgulama hatası')

            setIsVknVerified(true)
            if (data.isEInvoiceUser) {
                setUserType('E-INVOICE')
                setInvoiceSettings(prev => ({ ...prev, profile: 'TICARIFATURA' })) // Default to Ticari for B2B
            } else {
                setUserType('E-ARCHIVE')
                setInvoiceSettings(prev => ({ ...prev, profile: 'EARSIVFATURA' }))
            }

            // Auto-fill details (for both types)
            setRecipient(prev => ({
                ...prev,
                title: data.title || prev.title,
                address: data.address || prev.address,
                city: data.city || prev.city,
                // district: data.district || prev.district, // Not returned yet
                taxOffice: data.taxOffice || prev.taxOffice,
                email: data.email || prev.email,
            }))
        } catch (error: any) {
            alert(error.message)
            // Fallback manual selection if needed, but keeping it strict for now
            // setUserType(null)
        } finally {
            setCheckingUser(false)
        }
    }

    // Item Management
    const addItem = () => {
        setItems([...items, { name: '', quantity: 1, price: 0, vatRate: 20, total: 0, totalWithVat: 0 }])
    }

    const updateItem = (index: number, field: string, value: any) => {
        const newItems = [...items]

        if (field === 'totalWithVat') {
            // 1. Update the raw value immediately so input doesn't jump
            newItems[index].totalWithVat = value

            // 2. Calculate underlying price
            const totalWithVat = parseFloat(value)
            const qty = parseFloat(newItems[index].quantity) || 1
            const vatRate = parseFloat(newItems[index].vatRate) || 0

            if (!isNaN(totalWithVat)) {
                const vatMultiplier = 1 + (vatRate / 100)
                const newPrice = totalWithVat / (qty * vatMultiplier)
                newItems[index].price = newPrice
                newItems[index].total = newPrice * qty
            }
        } else {
            // Standard update for other fields
            newItems[index][field] = value

            // If updating Qty/Price/Vat, we must sync the totalWithVat display value
            if (field === 'quantity' || field === 'price' || field === 'vatRate') {
                const qty = parseFloat(field === 'quantity' ? value : newItems[index].quantity) || 0
                const price = parseFloat(field === 'price' ? value : newItems[index].price) || 0
                const vatRate = parseFloat(field === 'vatRate' ? value : newItems[index].vatRate) || 0

                newItems[index].total = qty * price

                // Update the display value for TotalWithVat
                const totalVatIncluded = (qty * price) * (1 + vatRate / 100)
                // Use toFixed(2) to keep it clean, but only update if it's not the field being edited
                // Actually, just set it, the user isn't editing this field right now.
                newItems[index].totalWithVat = totalVatIncluded.toFixed(2)
            }
        }
        setItems(newItems)
    }

    const removeItem = (index: number) => {
        setItems(items.filter((_, i) => i !== index))
    }

    const calculateTotals = () => {
        let subtotal = 0
        let vatTotal = 0

        items.forEach(item => {
            const base = (item.quantity || 0) * (item.price || 0)
            const vat = base * ((item.vatRate || 0) / 100)
            subtotal += base
            vatTotal += vat
        })

        return { subtotal, vatTotal, grandTotal: subtotal + vatTotal }
    }

    const totals = calculateTotals()

    // Success State
    const [successUuid, setSuccessUuid] = useState<string | null>(null)

    // Submit Logic
    const handleSubmit = async () => {
        if (!isVknVerified) {
            alert('Lütfen önce VKN sorgulaması yapınız.')
            return
        }
        if (items.length === 0) {
            alert('Lütfen en az bir ürün kalemi ekleyiniz.')
            return
        }
        if (!recipient.title || !recipient.address) {
            alert('Lütfen alıcı ünvan ve adres bilgilerini doldurunuz.')
            return
        }
        if (!recipient.city || !recipient.district) {
            alert('Lütfen İl ve İlçe bilgilerini eksiksiz doldurunuz. (E-Fatura/Arşiv için zorunludur)')
            return
        }

        setSubmitting(true)
        try {
            const res = await fetch('/api/finance/einvoice/send', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    recipient,
                    settings: invoiceSettings,
                    items
                })
            })

            const data = await res.json()
            if (!res.ok) throw new Error(data.error || 'Gönderim başarısız')

            setSuccessUuid(data.uuid)
            // alert('Fatura başarıyla kuyruğa alındı/gönderildi! UUID: ' + data.uuid)
            // router.push('/finance/invoices')
        } catch (error: any) {
            alert('Hata: ' + error.message)
        } finally {
            setSubmitting(false)
        }
    }

    if (successUuid) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-6 text-center">
                <div className="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mb-4">
                    <Send className="h-10 w-10" />
                </div>
                <h2 className="text-3xl font-bold tracking-tight text-emerald-900">Fatura Başarıyla Gönderildi!</h2>
                <p className="text-slate-600 max-w-md">
                    Fatura GİB sistemine iletilmek üzere sıraya alındı. Hemen yazdırabilir veya yeni işlem yapabilirsiniz.
                </p>

                <div className="flex flex-col sm:flex-row gap-4 mt-8">
                    <Button
                        size="lg"
                        variant="outline"
                        className="min-w-[160px]"
                        onClick={() => {
                            // Determine type based on profile
                            const type = invoiceSettings.profile === 'EARSIVFATURA' ? 'earchive' : 'einvoice'
                            const direction = type === 'einvoice' ? 'outgoing' : undefined
                            const params = new URLSearchParams({ type })
                            if (direction) params.append('direction', direction)

                            // Open PDF in new tab
                            window.open(`/api/finance/einvoice/pdf/${successUuid}?${params.toString()}`, '_blank')
                        }}
                    >
                        <FileText className="mr-2 h-5 w-5" />
                        PDF İndir
                    </Button>

                    <Button
                        size="lg"
                        variant="outline"
                        className="min-w-[160px]"
                        onClick={() => {
                            const direction = invoiceSettings.profile === 'EARSIVFATURA' ? '' : '?direction=OUTGOING'
                            window.open(`/api/finance/einvoice/html/${successUuid}${direction}`, '_blank')
                        }}
                    >
                        <FileText className="mr-2 h-5 w-5" />
                        HTML Önizle
                    </Button>

                    <Button
                        size="lg"
                        className="min-w-[160px]"
                        onClick={() => window.location.reload()}
                    >
                        <Plus className="mr-2 h-5 w-5" />
                        Yeni Fatura
                    </Button>
                </div>

                <Button variant="link" onClick={() => router.push('/finance/invoices')} className="mt-4">
                    Fatura Listesine Dön
                </Button>
            </div>
        )
    }

    return (
        <div className="space-y-6 max-w-5xl mx-auto pb-20">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight">Yeni E-Fatura Oluştur</h2>
                    <p className="text-muted-foreground">Giden fatura ve e-arşiv gönderimi</p>
                </div>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
                {/* 1. Alıcı Bilgileri */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <UserCheck className="h-5 w-5" />
                            Alıcı Bilgileri
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="flex gap-2 items-end">
                            <div className="flex-1 space-y-2">
                                <Label>VKN / TCKN</Label>
                                <Input
                                    placeholder="11111111111"
                                    maxLength={11}
                                    value={recipient.vkn}
                                    onChange={(e) => {
                                        setRecipient({ ...recipient, vkn: e.target.value })
                                        setIsVknVerified(false) // Reset verification on change
                                        setUserType(null)
                                    }}
                                />
                            </div>
                            <Button
                                onClick={handleCheckUser}
                                disabled={checkingUser || !recipient.vkn}
                                variant={isVknVerified ? "outline" : "default"}
                                className={isVknVerified ? "border-emerald-500 text-emerald-600 bg-emerald-50 hover:bg-emerald-100" : ""}
                            >
                                {checkingUser ? 'Sorgulanıyor...' : isVknVerified ? 'Doğrulandı' : 'Sorgula'}
                            </Button>
                        </div>

                        {userType && (
                            <div className={`p-3 rounded-lg text-sm font-medium border ${userType === 'E-INVOICE'
                                ? 'bg-blue-50 text-blue-700 border-blue-200'
                                : 'bg-orange-50 text-orange-700 border-orange-200'
                                }`}>
                                {userType === 'E-INVOICE'
                                    ? '✅ E-FATURA Mükellefi (Sistemden sistemine gidecek)'
                                    : '⚠️ E-ARŞİV Kesilecek (Mail/Kağıt olarak iletilecek)'
                                }
                            </div>
                        )}

                        <div className="space-y-2">
                            <Label>Ünvan / Ad Soyad</Label>
                            <Input
                                placeholder="Firma Adı veya Şahıs Adı"
                                value={recipient.title}
                                onChange={(e) => setRecipient({ ...recipient, title: e.target.value })}
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Vergi Dairesi</Label>
                                <Input
                                    placeholder="Opsiyonel"
                                    value={recipient.taxOffice}
                                    onChange={(e) => setRecipient({ ...recipient, taxOffice: e.target.value })}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>E-Posta</Label>
                                <Input
                                    type="email"
                                    placeholder="musteri@mail.com"
                                    value={recipient.email}
                                    onChange={(e) => setRecipient({ ...recipient, email: e.target.value })}
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label>Adres</Label>
                            <Input
                                placeholder="Tam adres..."
                                value={recipient.address}
                                onChange={(e) => setRecipient({ ...recipient, address: e.target.value })}
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>İlçe</Label>
                                <Input
                                    placeholder="Örn: Kadıköy"
                                    value={recipient.district}
                                    onChange={(e) => setRecipient({ ...recipient, district: e.target.value })}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Şehir</Label>
                                <Input
                                    placeholder="Örn: İstanbul"
                                    value={recipient.city}
                                    onChange={(e) => setRecipient({ ...recipient, city: e.target.value })}
                                />
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* 2. Fatura Ayarları */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <FileText className="h-5 w-5" />
                            Fatura Detayları
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <Label>Fatura Tarihi</Label>
                            <Input
                                type="date"
                                value={invoiceSettings.date}
                                onChange={(e) => setInvoiceSettings({ ...invoiceSettings, date: e.target.value })}
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Senaryo</Label>
                                <Select
                                    value={invoiceSettings.profile}
                                    onValueChange={(val) => setInvoiceSettings({ ...invoiceSettings, profile: val })}
                                    disabled={!userType} // Lock until verified
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Seçiniz" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {userType === 'E-INVOICE' ? (
                                            <>
                                                <SelectItem value="TICARIFATURA">TICARIFATURA (Onaylı)</SelectItem>
                                                <SelectItem value="TEMELFATURA">TEMELFATURA (Otomatik)</SelectItem>
                                            </>
                                        ) : (
                                            <SelectItem value="EARSIVFATURA">EARSIVFATURA</SelectItem>
                                        )}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label>Fatura Tipi</Label>
                                <Select
                                    value={invoiceSettings.type}
                                    onValueChange={(val) => setInvoiceSettings({ ...invoiceSettings, type: val })}
                                >
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="SATIS">SATIŞ</SelectItem>
                                        <SelectItem value="IADE">İADE</SelectItem>
                                        <SelectItem value="ISTISNA">İSTİSNA</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        <div className="p-4 bg-slate-50 rounded-lg border text-sm text-slate-600">
                            <strong>Bilgi:</strong> E-Fatura senaryosu alıcının mükellefiyet durumuna göre otomatik belirlenir. Adres bilgilerinin eksiksiz girilmesi E-Arşiv faturaları için zorunludur.
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* 3. Ürün/Hizmet Kalemleri */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <ShoppingCart className="h-5 w-5" />
                            Hizmet ve Ürünler
                        </div>
                        <Button size="sm" onClick={addItem} variant="outline">
                            <Plus className="mr-2 h-4 w-4" /> Satır Ekle
                        </Button>
                    </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="w-[40%]">Hizmet/Ürün Adı</TableHead>
                                <TableHead className="w-[15%]">Miktar</TableHead>
                                <TableHead className="w-[15%]">Birim Fiyat</TableHead>
                                <TableHead className="w-[15%]">KDV %</TableHead>
                                <TableHead className="w-[15%]">Toplam (KDV Dahil)</TableHead>
                                <TableHead className="w-[5%]"></TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {items.map((item, index) => (
                                <TableRow key={index}>
                                    <TableCell>
                                        <Input
                                            value={item.name}
                                            onChange={(e) => updateItem(index, 'name', e.target.value)}
                                            placeholder="Ürün adı..."
                                            className="h-8"
                                        />
                                    </TableCell>
                                    <TableCell>
                                        <Input
                                            type="number"
                                            value={item.quantity}
                                            onChange={(e) => updateItem(index, 'quantity', e.target.value)}
                                            className="h-8"
                                        />
                                    </TableCell>
                                    <TableCell>
                                        <Input
                                            type="number"
                                            value={item.price}
                                            onChange={(e) => updateItem(index, 'price', e.target.value)}
                                            className="h-8"
                                        />
                                    </TableCell>
                                    <TableCell>
                                        <Select
                                            value={item.vatRate.toString()}
                                            onValueChange={(val) => updateItem(index, 'vatRate', parseInt(val))}
                                        >
                                            <SelectTrigger className="h-8">
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="0">%0</SelectItem>
                                                <SelectItem value="1">%1</SelectItem>
                                                <SelectItem value="10">%10</SelectItem>
                                                <SelectItem value="20">%20</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </TableCell>
                                    <TableCell>
                                        <Input
                                            type="number"
                                            // Bind directly to state value to prevent cursor jumping
                                            value={item.totalWithVat}
                                            onChange={(e) => updateItem(index, 'totalWithVat', e.target.value)}
                                            className="h-8 font-bold text-right"
                                            onClick={(e) => (e.target as HTMLInputElement).select()} // Select all on click for easy edit
                                        />
                                    </TableCell>
                                    <TableCell>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            className="h-8 w-8 text-red-500 hover:text-red-700 hover:bg-red-50"
                                            onClick={() => removeItem(index)}
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>

                    {items.length === 0 && (
                        <div className="text-center py-8 text-muted-foreground border-b border-dashed">
                            Henüz ürün eklenmedi.
                        </div>
                    )}

                    <div className="flex justify-end p-6">
                        <div className="w-64 space-y-2">
                            <div className="flex justify-between text-sm">
                                <span className="text-muted-foreground">Ara Toplam:</span>
                                <span>{totals.subtotal.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} TL</span>
                            </div>
                            <div className="flex justify-between text-sm">
                                <span className="text-muted-foreground">KDV Toplam:</span>
                                <span>{totals.vatTotal.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} TL</span>
                            </div>
                            <div className="flex justify-between text-lg font-bold border-t pt-2 mt-2">
                                <span>Genel Toplam:</span>
                                <span>{totals.grandTotal.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} TL</span>
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>

            <div className="flex justify-end gap-4 py-4">
                <Button variant="outline" onClick={() => router.back()}>İptal</Button>
                <Button
                    size="lg"
                    className="bg-indigo-600 hover:bg-indigo-700 min-w-[200px]"
                    onClick={handleSubmit}
                    disabled={submitting}
                >
                    <Send className="mr-2 h-4 w-4" />
                    {submitting ? 'Gönderiliyor...' : 'Faturayı Kes ve Gönder'}
                </Button>
            </div>
        </div>
    )
}
