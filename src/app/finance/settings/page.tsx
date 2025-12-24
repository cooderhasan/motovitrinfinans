'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Save, Settings, LogOut, Globe, FileImage } from 'lucide-react'

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
        faviconUrl: ''
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
                faviconUrl: settings.faviconUrl || ''
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
