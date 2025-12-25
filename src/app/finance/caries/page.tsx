'use client'

import { useState, useRef, useMemo } from 'react'
import Link from 'next/link'
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
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Plus, FileSpreadsheet, FileText, Printer, Pencil, Search } from 'lucide-react'

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

    // Filtreleme state'leri
    const [searchQuery, setSearchQuery] = useState('')
    const [typeFilter, setTypeFilter] = useState('ALL')
    const [balanceFilter, setBalanceFilter] = useState('ALL')

    const tableRef = useRef<HTMLDivElement>(null)

    const queryClient = useQueryClient()

    const { data: caries, isLoading } = useQuery({
        queryKey: ['caries'],
        queryFn: getCaries
    })

    // Filtrelenmiş cari listesi
    const filteredCaries = useMemo(() => {
        if (!caries) return []

        return caries.filter((cari: any) => {
            // İsim araması
            if (searchQuery && !cari.title.toLowerCase().includes(searchQuery.toLowerCase())) {
                return false
            }
            // Tip filtresi
            if (typeFilter !== 'ALL' && cari.type !== typeFilter) {
                return false
            }
            // Bakiye filtresi
            if (balanceFilter === 'DEBTOR' && (cari.currentBalance || 0) <= 0) {
                return false
            }
            if (balanceFilter === 'CREDITOR' && (cari.currentBalance || 0) >= 0) {
                return false
            }
            return true
        })
    }, [caries, searchQuery, typeFilter, balanceFilter])

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

    // Excel Export
    const exportToExcel = async () => {
        if (!caries?.length) {
            alert('Dışa aktarılacak veri yok')
            return
        }

        const XLSX = await import('xlsx')
        const data = caries.map((cari: any) => ({
            'Ünvan': cari.title,
            'Tip': cari.type === 'CUSTOMER' ? 'Müşteri' : cari.type === 'SUPPLIER' ? 'Tedarikçi' : 'Personel',
            'Para Birimi': cari.defaultCurrency?.code,
            'Durum': cari.isActive ? 'Aktif' : 'Pasif',
            'Açılış Bakiyesi': Number(cari.openingBalance),
            'Toplam Borç': cari.totalDebit || 0,
            'Toplam Alacak': cari.totalCredit || 0,
            'Güncel Bakiye': cari.currentBalance || 0
        }))

        const ws = XLSX.utils.json_to_sheet(data)
        const wb = XLSX.utils.book_new()
        XLSX.utils.book_append_sheet(wb, ws, 'Cariler')
        XLSX.writeFile(wb, `cariler_${new Date().toISOString().split('T')[0]}.xlsx`)
    }

    // PDF Export
    const exportToPDF = async () => {
        if (!caries?.length) {
            alert('Dışa aktarılacak veri yok')
            return
        }

        // Türkçe karakter dönüşümü (jsPDF varsayılan font UTF-8 desteklemiyor)
        const turkishToAscii = (text: string) => {
            const map: Record<string, string> = {
                'ç': 'c', 'Ç': 'C',
                'ğ': 'g', 'Ğ': 'G',
                'ı': 'i', 'İ': 'I',
                'ö': 'o', 'Ö': 'O',
                'ş': 's', 'Ş': 'S',
                'ü': 'u', 'Ü': 'U'
            }
            return text.replace(/[çÇğĞıİöÖşŞüÜ]/g, char => map[char] || char)
        }

        const { default: jsPDF } = await import('jspdf')
        const { default: autoTable } = await import('jspdf-autotable')

        const doc = new jsPDF()

        doc.setFontSize(18)
        doc.text('Cari Hesap Listesi', 14, 22)
        doc.setFontSize(10)
        doc.text(`Tarih: ${new Date().toLocaleDateString('tr-TR')}`, 14, 30)

        const tableData = caries.map((cari: any) => [
            turkishToAscii(cari.title || ''),
            cari.type === 'CUSTOMER' ? 'Musteri' : cari.type === 'SUPPLIER' ? 'Tedarikci' : 'Personel',
            cari.defaultCurrency?.code,
            cari.isActive ? 'Aktif' : 'Pasif',
            Number(cari.openingBalance).toLocaleString('tr-TR', { minimumFractionDigits: 2 }),
            (cari.currentBalance || 0).toLocaleString('tr-TR', { minimumFractionDigits: 2 })
        ])

        autoTable(doc, {
            head: [['Unvan', 'Tip', 'Para Birimi', 'Durum', 'Acilis Bakiyesi', 'Guncel Bakiye']],
            body: tableData,
            startY: 35,
            styles: { fontSize: 9 },
            headStyles: { fillColor: [51, 51, 51] }
        })

        doc.save(`cariler_${new Date().toISOString().split('T')[0]}.pdf`)
    }

    // Print
    const handlePrint = () => {
        window.print()
    }

    if (isLoading) return <div className="p-8">Yükleniyor...</div>

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 no-print">
                <div>
                    <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">Cari Hesaplar</h2>
                    <p className="text-muted-foreground text-sm">Müşteri, Tedarikçi ve Personel yönetimi</p>
                </div>

                <div className="flex flex-wrap gap-2">
                    <Button variant="outline" size="sm" onClick={handlePrint}>
                        <Printer className="mr-2 h-4 w-4" /> Yazdır
                    </Button>
                    <Button variant="outline" size="sm" onClick={exportToExcel}>
                        <FileSpreadsheet className="mr-2 h-4 w-4" /> Excel
                    </Button>
                    <Button variant="outline" size="sm" onClick={exportToPDF}>
                        <FileText className="mr-2 h-4 w-4" /> PDF
                    </Button>

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
            </div>

            {/* Print Header */}
            <div className="hidden print-only mb-4">
                <h1 className="text-2xl font-bold">Cari Hesap Listesi</h1>
                <p className="text-sm text-gray-600">Tarih: {new Date().toLocaleDateString('tr-TR')}</p>
            </div>

            {/* Filtreleme Alanı */}
            <div className="flex flex-col sm:flex-row gap-4 p-4 bg-muted/50 rounded-lg no-print">
                {/* Arama */}
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Cari ara..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-10"
                    />
                </div>

                {/* Tip Filtresi */}
                <Select value={typeFilter} onValueChange={setTypeFilter}>
                    <SelectTrigger className="w-full sm:w-[180px]">
                        <SelectValue placeholder="Cari Tipi" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="ALL">Tüm Tipler</SelectItem>
                        <SelectItem value="CUSTOMER">Müşteri</SelectItem>
                        <SelectItem value="SUPPLIER">Tedarikçi</SelectItem>
                        <SelectItem value="EMPLOYEE">Personel</SelectItem>
                    </SelectContent>
                </Select>

                {/* Bakiye Filtresi */}
                <Select value={balanceFilter} onValueChange={setBalanceFilter}>
                    <SelectTrigger className="w-full sm:w-[180px]">
                        <SelectValue placeholder="Bakiye Durumu" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="ALL">Tüm Bakiyeler</SelectItem>
                        <SelectItem value="DEBTOR">Borçlu Cariler</SelectItem>
                        <SelectItem value="CREDITOR">Alacaklı Cariler</SelectItem>
                    </SelectContent>
                </Select>
            </div>

            <div className="rounded-md border bg-white overflow-x-auto" ref={tableRef}>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Ünvan</TableHead>
                            <TableHead>Tip</TableHead>
                            <TableHead>Para Birimi</TableHead>
                            <TableHead>Durum</TableHead>
                            <TableHead className="text-right">Açılış Bakiyesi</TableHead>
                            <TableHead className="text-right">Güncel Bakiye</TableHead>
                            <TableHead className="no-print"></TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {filteredCaries?.map((cari: any) => (
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
                                <TableCell className="text-right font-bold">
                                    <span className={cari.currentBalance > 0 ? 'text-rose-600' : cari.currentBalance < 0 ? 'text-emerald-600' : ''}>
                                        {(cari.currentBalance || 0).toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
                                    </span>
                                </TableCell>
                                <TableCell className="no-print">
                                    <Link href={`/finance/caries/${cari.id}/edit`}>
                                        <Button variant="ghost" size="icon" className="h-8 w-8">
                                            <Pencil className="h-4 w-4" />
                                        </Button>
                                    </Link>
                                </TableCell>
                            </TableRow>
                        ))}
                        {!filteredCaries?.length && (
                            <TableRow>
                                <TableCell colSpan={7} className="text-center h-24 text-muted-foreground">
                                    {caries?.length ? 'Filtrelere uygun kayıt bulunamadı.' : 'Kayıt bulunamadı.'}
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </div>
        </div>
    )
}
