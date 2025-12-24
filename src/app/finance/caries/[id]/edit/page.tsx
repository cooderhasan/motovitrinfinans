'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ArrowLeft, Save, Trash2 } from 'lucide-react'

// Cari detayını çekme
async function getCari(id: string) {
    const res = await fetch(`/api/caries/${id}`)
    if (!res.ok) throw new Error('Cari bulunamadı')
    return res.json()
}

// Cari güncelleme
async function updateCari(id: string, data: any) {
    const res = await fetch(`/api/caries/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
    })
    if (!res.ok) {
        const errorData = await res.json()
        throw new Error(errorData.error || 'Cari güncellenemedi')
    }
    return res.json()
}

// Cari silme
async function deleteCari(id: string) {
    const res = await fetch(`/api/caries/${id}`, {
        method: 'DELETE'
    })
    if (!res.ok) {
        const errorData = await res.json()
        throw new Error(errorData.error || 'Cari silinemedi')
    }
    return res.json()
}

export default function EditCariPage() {
    const router = useRouter()
    const params = useParams()
    const queryClient = useQueryClient()
    const cariId = params.id as string

    const [formData, setFormData] = useState({
        title: '',
        type: 'CUSTOMER',
        phone: '',
        email: '',
        address: '',
        city: '',
        taxNumber: '',
        taxOffice: '',
        notes: '',
        defaultCurrencyCode: 'TL',
        isActive: true
    })

    const { data: cari, isLoading } = useQuery({
        queryKey: ['cari', cariId],
        queryFn: () => getCari(cariId),
        enabled: !!cariId
    })

    // Form'u cari verileriyle doldur
    useEffect(() => {
        if (cari) {
            setFormData({
                title: cari.title || '',
                type: cari.type || 'CUSTOMER',
                phone: cari.phone || '',
                email: cari.email || '',
                address: cari.address || '',
                city: cari.city || '',
                taxNumber: cari.taxNumber || '',
                taxOffice: cari.taxOffice || '',
                notes: cari.notes || '',
                defaultCurrencyCode: cari.defaultCurrency?.code || 'TL',
                isActive: cari.isActive ?? true
            })
        }
    }, [cari])

    const updateMutation = useMutation({
        mutationFn: (data: any) => updateCari(cariId, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['caries'] })
            alert('Cari başarıyla güncellendi!')
            router.push('/finance/caries')
        },
        onError: (error) => {
            alert('Hata: ' + error.message)
        }
    })

    const deleteMutation = useMutation({
        mutationFn: () => deleteCari(cariId),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['caries'] })
            alert('Cari silindi!')
            router.push('/finance/caries')
        },
        onError: (error) => {
            alert('Hata: ' + error.message)
        }
    })

    const handleChange = (field: string, value: any) => {
        setFormData(prev => ({ ...prev, [field]: value }))
    }

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault()
        if (!formData.title.trim()) {
            alert('Ünvan zorunludur')
            return
        }
        updateMutation.mutate(formData)
    }

    const handleDelete = () => {
        if (confirm('Bu cariyi silmek istediğinizden emin misiniz? Bu işlem geri alınamaz.')) {
            deleteMutation.mutate()
        }
    }

    if (isLoading) {
        return <div className="p-8">Yükleniyor...</div>
    }

    return (
        <div className="space-y-6 pb-20">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <Button variant="outline" size="icon" onClick={() => router.back()}>
                        <ArrowLeft className="h-4 w-4" />
                    </Button>
                    <div>
                        <h2 className="text-3xl font-bold tracking-tight">Cari Düzenle</h2>
                        <p className="text-muted-foreground">{cari?.title}</p>
                    </div>
                </div>
                <Button variant="destructive" onClick={handleDelete} disabled={deleteMutation.isPending}>
                    <Trash2 className="mr-2 h-4 w-4" />
                    {deleteMutation.isPending ? 'Siliniyor...' : 'Cariyi Sil'}
                </Button>
            </div>

            <form onSubmit={handleSubmit}>
                <div className="grid gap-6 md:grid-cols-2">
                    {/* Temel Bilgiler */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Temel Bilgiler</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="grid gap-2">
                                <Label htmlFor="title">Ünvan / Ad Soyad *</Label>
                                <Input
                                    id="title"
                                    value={formData.title}
                                    onChange={(e) => handleChange('title', e.target.value)}
                                    required
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="grid gap-2">
                                    <Label htmlFor="type">Cari Türü</Label>
                                    <select
                                        id="type"
                                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                                        value={formData.type}
                                        onChange={(e) => handleChange('type', e.target.value)}
                                    >
                                        <option value="CUSTOMER">Müşteri</option>
                                        <option value="SUPPLIER">Tedarikçi</option>
                                        <option value="EMPLOYEE">Personel</option>
                                    </select>
                                </div>
                                <div className="grid gap-2">
                                    <Label htmlFor="currency">Para Birimi</Label>
                                    <select
                                        id="currency"
                                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                                        value={formData.defaultCurrencyCode}
                                        onChange={(e) => handleChange('defaultCurrencyCode', e.target.value)}
                                    >
                                        <option value="TL">TL</option>
                                        <option value="USD">USD</option>
                                    </select>
                                </div>
                            </div>

                            <div className="grid gap-2">
                                <Label htmlFor="isActive">Durum</Label>
                                <select
                                    id="isActive"
                                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                                    value={formData.isActive ? 'true' : 'false'}
                                    onChange={(e) => handleChange('isActive', e.target.value === 'true')}
                                >
                                    <option value="true">Aktif</option>
                                    <option value="false">Pasif</option>
                                </select>
                            </div>
                        </CardContent>
                    </Card>

                    {/* İletişim Bilgileri */}
                    <Card>
                        <CardHeader>
                            <CardTitle>İletişim Bilgileri</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="grid gap-2">
                                    <Label htmlFor="phone">Telefon</Label>
                                    <Input
                                        id="phone"
                                        type="tel"
                                        value={formData.phone}
                                        onChange={(e) => handleChange('phone', e.target.value)}
                                        placeholder="0532 123 45 67"
                                    />
                                </div>
                                <div className="grid gap-2">
                                    <Label htmlFor="email">E-posta</Label>
                                    <Input
                                        id="email"
                                        type="email"
                                        value={formData.email}
                                        onChange={(e) => handleChange('email', e.target.value)}
                                        placeholder="ornek@email.com"
                                    />
                                </div>
                            </div>

                            <div className="grid gap-2">
                                <Label htmlFor="address">Adres</Label>
                                <Input
                                    id="address"
                                    value={formData.address}
                                    onChange={(e) => handleChange('address', e.target.value)}
                                    placeholder="Sokak, Mahalle, No"
                                />
                            </div>

                            <div className="grid gap-2">
                                <Label htmlFor="city">Şehir</Label>
                                <Input
                                    id="city"
                                    value={formData.city}
                                    onChange={(e) => handleChange('city', e.target.value)}
                                    placeholder="İstanbul"
                                />
                            </div>
                        </CardContent>
                    </Card>

                    {/* Vergi Bilgileri */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Vergi Bilgileri</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="grid gap-2">
                                    <Label htmlFor="taxNumber">Vergi No / TC Kimlik</Label>
                                    <Input
                                        id="taxNumber"
                                        value={formData.taxNumber}
                                        onChange={(e) => handleChange('taxNumber', e.target.value)}
                                    />
                                </div>
                                <div className="grid gap-2">
                                    <Label htmlFor="taxOffice">Vergi Dairesi</Label>
                                    <Input
                                        id="taxOffice"
                                        value={formData.taxOffice}
                                        onChange={(e) => handleChange('taxOffice', e.target.value)}
                                    />
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Notlar */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Notlar</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <textarea
                                className="flex min-h-[100px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                                value={formData.notes}
                                onChange={(e) => handleChange('notes', e.target.value)}
                                placeholder="Cari hakkında notlar..."
                            />
                        </CardContent>
                    </Card>
                </div>

                <div className="flex justify-end gap-4 mt-6">
                    <Button type="button" variant="outline" onClick={() => router.back()}>
                        İptal
                    </Button>
                    <Button type="submit" size="lg" disabled={updateMutation.isPending}>
                        <Save className="mr-2 h-4 w-4" />
                        {updateMutation.isPending ? 'Kaydediliyor...' : 'Değişiklikleri Kaydet'}
                    </Button>
                </div>
            </form>
        </div>
    )
}
