'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table'
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
    DialogFooter
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Plus } from 'lucide-react'

// Cari Listesi Çekme
async function getCaries() {
    const res = await fetch('/api/caries')
    if (!res.ok) throw new Error('Veri çekilemedi')
    return res.json()
}

// Yeni Cari Ekleme
async function createCari(data: any) {
    const res = await fetch('/api/caries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
    })
    if (!res.ok) throw new Error('Oluşturulamadı')
    return res.json()
}

export default function CariesPage() {
    const [isCreateOpen, setIsCreateOpen] = useState(false)
    const [newCari, setNewCari] = useState({
        title: '',
        type: 'CUSTOMER',
        defaultCurrencyCode: 'TL',
        openingBalance: 0
    })

    const queryClient = useQueryClient()

    const { data: caries, isLoading } = useQuery({
        queryKey: ['caries'],
        queryFn: getCaries
    })

    const createMutation = useMutation({
        mutationFn: createCari,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['caries'] })
            setIsCreateOpen(false)
            setNewCari({ title: '', type: 'CUSTOMER', defaultCurrencyCode: 'TL', openingBalance: 0 })
        }
    })

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault()
        createMutation.mutate(newCari)
    }

    if (isLoading) return <div className="p-8">Yükleniyor...</div>

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight">Cari Hesaplar</h2>
                    <p className="text-muted-foreground">Müşteri, Tedarikçi ve Personel yönetimi</p>
                </div>

                <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
                    <DialogTrigger asChild>
                        <Button><Plus className="mr-2 h-4 w-4" /> Yeni Cari Ekle</Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Yeni Cari Hesabı</DialogTitle>
                        </DialogHeader>
                        <form onSubmit={handleSubmit} className="space-y-4 py-4">
                            <div className="grid gap-2">
                                <Label htmlFor="title">Ünvan / Ad Soyad</Label>
                                <Input
                                    id="title"
                                    value={newCari.title}
                                    onChange={(e) => setNewCari({ ...newCari, title: e.target.value })}
                                    required
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="grid gap-2">
                                    <Label htmlFor="type">Cari Türü</Label>
                                    <select
                                        id="type"
                                        className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                                        value={newCari.type}
                                        onChange={(e) => setNewCari({ ...newCari, type: e.target.value })}
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
                                        className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                                        value={newCari.defaultCurrencyCode}
                                        onChange={(e) => setNewCari({ ...newCari, defaultCurrencyCode: e.target.value })}
                                    >
                                        <option value="TL">TL</option>
                                        <option value="USD">USD</option>
                                    </select>
                                </div>
                            </div>

                            <div className="grid gap-2">
                                <Label htmlFor="openingBalance">Açılış Bakiyesi</Label>
                                <Input
                                    id="openingBalance"
                                    type="number"
                                    step="0.01"
                                    value={newCari.openingBalance}
                                    onChange={(e) => setNewCari({ ...newCari, openingBalance: parseFloat(e.target.value) || 0 })}
                                />
                                <p className="text-xs text-muted-foreground">Pozitif giriniz. Müşteri & Personel için borç, Tedarikçi için alacak olarak kaydedilir.</p>
                            </div>

                            <DialogFooter>
                                <Button type="submit" disabled={createMutation.isPending}>
                                    {createMutation.isPending ? 'Kaydediliyor...' : 'Kaydet'}
                                </Button>
                            </DialogFooter>
                        </form>
                    </DialogContent>
                </Dialog>
            </div>

            <div className="rounded-md border bg-white">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Ünvan</TableHead>
                            <TableHead>Tip</TableHead>
                            <TableHead>Para Birimi</TableHead>
                            <TableHead>Durum</TableHead>
                            <TableHead className="text-right">Açılış Bakiyesi</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {caries?.map((cari: any) => (
                            <TableRow key={cari.id}>
                                <TableCell className="font-medium">{cari.title}</TableCell>
                                <TableCell>{cari.type === 'CUSTOMER' ? 'Müşteri' : cari.type === 'SUPPLIER' ? 'Tedarikçi' : 'Personel'}</TableCell>
                                <TableCell>{cari.defaultCurrency?.code}</TableCell>
                                <TableCell>
                                    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${cari.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                                        {cari.isActive ? 'Aktif' : 'Pasif'}
                                    </span>
                                </TableCell>
                                <TableCell className="text-right">
                                    {Number(cari.openingBalance).toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
                                </TableCell>
                            </TableRow>
                        ))}
                        {!caries?.length && (
                            <TableRow>
                                <TableCell colSpan={5} className="text-center h-24 text-muted-foreground">Kayıt bulunamadı.</TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </div>
        </div>
    )
}
