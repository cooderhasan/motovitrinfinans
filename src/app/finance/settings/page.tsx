'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Save, Settings, LogOut, Globe, FileImage, CloudCog } from 'lucide-react'

// Settings fetch
async function getSettings() {
    const res = await fetch('/api/settings')
    if (!res.ok) throw new Error('Ayarlar yuklenemedi')
    return res.json()
}

// Settings update
async function updateSettings(data: any) {
    const res = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
    })
    if (!res.ok) throw new Error('Ayarlar guncellenemedi')
    return res.json()
}

export default function SettingsPage() {
    const router = useRouter()
    const queryClient = useQueryClient()

    const [formData, setFormData] = useState({
        siteTitle: '',
        siteDescription: '',
        faviconUrl: '',
        logoUrl: '',
        nesApiKey: '',
        nesApiUrl: 'https://api.nes.com.tr/',
        companyTitle: '',
        companyVkn: '',
        companyAddress: '',
        companyCity: '',
        companyDistrict: '',
        companyInvoicePrefix: 'MVT' // Default suggestion
    })

    const { data: settings, isLoading } = useQuery({
        queryKey: ['settings'],
        queryFn: getSettings
    })

    useEffect(() => {
        if (settings) {
            setFormData({
                siteTitle: settings.siteTitle || '',
                siteDescription: settings.siteDescription || '',
                faviconUrl: settings.faviconUrl || '',
                logoUrl: settings.logoUrl || '',
                nesApiKey: settings.nesApiKey || '',
                nesApiUrl: settings.nesApiUrl || 'https://api.nes.com.tr/',
                companyTitle: settings.companyTitle || '',
                companyVkn: settings.companyVkn || '',
                companyAddress: settings.companyAddress || '',
                companyCity: settings.companyCity || '',
                companyDistrict: settings.companyDistrict || '',
                companyInvoicePrefix: settings.companyInvoicePrefix || ''
            })
        }
    }, [settings])

    const updateMutation = useMutation({
        mutationFn: updateSettings,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['settings'] })
            alert('Ayarlar kaydedildi!')
        },
        onError: (error) => {
            alert('Hata: ' + error.message)
        }
    })

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault()
        updateMutation.mutate(formData)
    }

    const handleLogout = async () => {
        await fetch('/api/auth/login', { method: 'DELETE' })
        router.push('/login')
        router.refresh()
    }

    if (isLoading) {
        return <div className="p-4 md:p-8">Yukleniyor...</div>
    }

    return (
        <div className="space-y-6 p-4 md:p-0">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                    <h2 className="text-2xl md:text-3xl font-bold tracking-tight">Ayarlar</h2>
                    <p className="text-muted-foreground text-sm md:text-base">Site yapilandirmasi ve hesap yonetimi</p>
                </div>
                <Button variant="destructive" onClick={handleLogout} className="w-full md:w-auto">
                    <LogOut className="mr-2 h-4 w-4" /> Cikis Yap
                </Button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
                {/* Site Bilgileri */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Globe className="h-5 w-5" />
                            Site Bilgileri
                        </CardTitle>
                        <CardDescription>
                            Sitenizin basligi ve aciklamasi
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid gap-2">
                            <Label htmlFor="siteTitle">Site Basligi</Label>
                            <Input
                                id="siteTitle"
                                value={formData.siteTitle}
                                onChange={(e) => setFormData(prev => ({ ...prev, siteTitle: e.target.value }))}
                                placeholder="Finans ERP"
                            />
                            <p className="text-xs text-muted-foreground">
                                Tarayici sekmesinde gorunecek baslik
                            </p>
                        </div>

                        <div className="grid gap-2">
                            <Label htmlFor="siteDescription">Site Aciklamasi</Label>
                            <Input
                                id="siteDescription"
                                value={formData.siteDescription}
                                onChange={(e) => setFormData(prev => ({ ...prev, siteDescription: e.target.value }))}
                                placeholder="Finansal Yonetim Sistemi"
                            />
                        </div>
                    </CardContent>
                </Card>

                {/* Firma Logosu */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <FileImage className="h-5 w-5" />
                            Firma Logosu
                        </CardTitle>
                        <CardDescription>
                            Sol menüde görünecek firma logosu
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid gap-2">
                            <Label htmlFor="logoUrl">Logo URL</Label>
                            <Input
                                id="logoUrl"
                                value={formData.logoUrl}
                                onChange={(e) => setFormData(prev => ({ ...prev, logoUrl: e.target.value }))}
                                placeholder="/logo.png veya https://..."
                            />
                            <p className="text-xs text-muted-foreground">
                                Logo dosyasının yolu (önerilen boyut: 150x40 piksel)
                            </p>
                        </div>

                        {formData.logoUrl && (
                            <div className="flex items-center gap-2 p-4 bg-slate-900 rounded-lg">
                                <span className="text-sm text-slate-400">Önizleme:</span>
                                <img
                                    src={formData.logoUrl}
                                    alt="Logo"
                                    className="h-10 max-w-[150px] object-contain"
                                    onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
                                />
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* E-Fatura Ayarları */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <CloudCog className="h-5 w-5" />
                            E-Fatura Entegrasyonu (NES Bilgi)
                        </CardTitle>
                        <CardDescription>
                            Gelen faturaları çekmek için gerekli API bilgileri
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid gap-2">
                            <Label htmlFor="nesApiUrl">API Base URL</Label>
                            <Input
                                id="nesApiUrl"
                                value={formData.nesApiUrl}
                                onChange={(e) => setFormData(prev => ({ ...prev, nesApiUrl: e.target.value }))}
                                placeholder="https://api.nes.com.tr/"
                            />
                            <p className="text-xs text-muted-foreground">
                                Canlı ortam: https://api.nes.com.tr/ - Test ortamı: https://apitest.nes.com.tr/
                            </p>
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="nesApiKey">API Anahtarı (Bearer Token)</Label>
                            <Input
                                id="nesApiKey"
                                type="password"
                                value={formData.nesApiKey}
                                onChange={(e) => setFormData(prev => ({ ...prev, nesApiKey: e.target.value }))}
                                placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                            />
                            <p className="text-xs text-muted-foreground">
                                NES Portal {'>'} Yönetim Paneli {'>'} API Tanımları sayfasından oluşturduğunuz token.
                            </p>
                        </div>
                    </CardContent>
                </Card>

                {/* Firma Resmi Bilgileri (E-Fatura Icin) */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <FileImage className="h-5 w-5" />
                            Resmi Firma Bilgileri
                        </CardTitle>
                        <CardDescription>
                            E-Fatura gönderiminde "Gönderici" (Siz) olarak görünecek bilgiler. Eksiksiz doldurunuz.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid gap-2">
                            <Label htmlFor="companyTitle">Firma Resmi Unvanı</Label>
                            <Input
                                id="companyTitle"
                                value={formData.companyTitle}
                                onChange={(e) => setFormData(prev => ({ ...prev, companyTitle: e.target.value }))}
                                placeholder="Örn: MOTOVITRIN OTOMOTIV A.S."
                            />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="companyVkn">VKN / TCKN</Label>
                            <Input
                                id="companyVkn"
                                value={formData.companyVkn}
                                onChange={(e) => setFormData(prev => ({ ...prev, companyVkn: e.target.value }))}
                                placeholder="Vergi Kimlik Numarası"
                                maxLength={11}
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="grid gap-2">
                                <Label htmlFor="companyCity">İl</Label>
                                <Input
                                    id="companyCity"
                                    value={formData.companyCity}
                                    onChange={(e) => setFormData(prev => ({ ...prev, companyCity: e.target.value }))}
                                    placeholder="Örn: ISTANBUL"
                                />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="companyDistrict">İlçe</Label>
                                <Input
                                    id="companyDistrict"
                                    value={formData.companyDistrict}
                                    onChange={(e) => setFormData(prev => ({ ...prev, companyDistrict: e.target.value }))}
                                    placeholder="Örn: ATASEHIR"
                                />
                            </div>
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="companyAddress">Açık Adres (Sokak/Mahalle/No)</Label>
                            <Input
                                id="companyAddress"
                                value={formData.companyAddress}
                                onChange={(e) => setFormData(prev => ({ ...prev, companyAddress: e.target.value }))}
                                placeholder="Örn: Atatürk Mah. Çiçek Sok. No:5"
                            />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="companyInvoicePrefix">Fatura Serisi / Ön Eki (3 Harf)</Label>
                            <Input
                                id="companyInvoicePrefix"
                                value={formData.companyInvoicePrefix}
                                onChange={(e) => setFormData(prev => ({ ...prev, companyInvoicePrefix: e.target.value.toUpperCase().slice(0, 3) }))}
                                placeholder="Örn: MVT"
                                maxLength={3}
                            />
                            <p className="text-xs text-muted-foreground">E-Fatura gönderiminde kullanılacak 3 harfli seri başlığı.</p>
                        </div>
                    </CardContent>
                </Card>

                {/* Favicon */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <FileImage className="h-5 w-5" />
                            Favicon
                        </CardTitle>
                        <CardDescription>
                            Tarayici sekmesinde gorunecek ikon
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid gap-2">
                            <Label htmlFor="faviconUrl">Favicon URL</Label>
                            <Input
                                id="faviconUrl"
                                value={formData.faviconUrl}
                                onChange={(e) => setFormData(prev => ({ ...prev, faviconUrl: e.target.value }))}
                                placeholder="/favicon.ico"
                            />
                            <p className="text-xs text-muted-foreground">
                                Favicon dosyasinin yolu (ornek: /favicon.ico veya tam URL)
                            </p>
                        </div>

                        {formData.faviconUrl && (
                            <div className="flex items-center gap-2">
                                <span className="text-sm text-muted-foreground">Onizleme:</span>
                                <img
                                    src={formData.faviconUrl}
                                    alt="Favicon"
                                    className="w-8 h-8 border rounded"
                                    onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
                                />
                            </div>
                        )}
                    </CardContent>
                </Card>

                <div className="flex justify-end">
                    <Button type="submit" size="lg" disabled={updateMutation.isPending} className="w-full md:w-auto">
                        <Save className="mr-2 h-4 w-4" />
                        {updateMutation.isPending ? 'Kaydediliyor...' : 'Ayarlari Kaydet'}
                    </Button>
                </div>
            </form>
        </div>
    )
}
