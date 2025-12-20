'use client'

import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Plus } from 'lucide-react'

// Şimdilik sadece yönlendirme ve basit bir "Yapım Aşamasında" veya boş bir liste gösterelim.
// Kullanıcı "Yeni Fatura" diyebilsin.

export default function InvoicesIndexPage() {
    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight">Faturalar & Fişler</h2>
                    <p className="text-muted-foreground">Alış ve Satış hareketlerinizi yönetin.</p>
                </div>
                <div className="flex gap-2">
                    <Link href="/finance/invoices/new">
                        <Button className="bg-orange-600 hover:bg-orange-700">
                            <Plus className="mr-2 h-4 w-4" /> Yeni Alış Faturası
                        </Button>
                    </Link>
                    <Link href="/finance/sales/new">
                        <Button className="bg-blue-600 hover:bg-blue-700">
                            <Plus className="mr-2 h-4 w-4" /> Yeni Satış Fişi
                        </Button>
                    </Link>
                </div>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
                <Card className="hover:bg-slate-50 transition-colors cursor-pointer border-l-4 border-l-orange-500">
                    <CardContent className="pt-6">
                        <h3 className="text-xl font-semibold text-slate-800">Son Alış Faturaları</h3>
                        <p className="text-sm text-slate-500 mb-4">Tedarikçi borçlanmaları</p>
                        <div className="text-center py-8 text-slate-400 border border-dashed rounded-md bg-white">
                            Henüz fatura girişi yapılmadı veya liste yükleniyor...
                            {/* Buraya son 5 fatura component'i gelecek */}
                        </div>
                    </CardContent>
                </Card>

                <Card className="hover:bg-slate-50 transition-colors cursor-pointer border-l-4 border-l-blue-500">
                    <CardContent className="pt-6">
                        <h3 className="text-xl font-semibold text-slate-800">Son Satış Fişleri</h3>
                        <p className="text-sm text-slate-500 mb-4">Müşteri alacaklanmaları</p>
                        <div className="text-center py-8 text-slate-400 border border-dashed rounded-md bg-white">
                            Henüz satış girişi yapılmadı veya liste yükleniyor...
                            {/* Buraya son 5 satış component'i gelecek */}
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}
