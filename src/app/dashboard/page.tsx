'use client'

import { useQuery } from '@tanstack/react-query'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ArrowUpCircle, ArrowDownCircle, DollarSign, Wallet } from 'lucide-react'
import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Tooltip } from 'recharts'

async function getDashboardData() {
    const res = await fetch('/api/reports/dashboard')
    if (!res.ok) throw new Error('Veri çekilemedi')
    return res.json()
}

export default function DashboardPage() {
    const { data, isLoading } = useQuery({
        queryKey: ['dashboard'],
        queryFn: getDashboardData
    })

    if (isLoading) return <div className="p-10">Yükleniyor...</div>

    const summary = data?.summary || {}
    const tlSummary = summary['TL'] || { totalDebit: 0, totalCredit: 0, balance: 0 }
    const usdSummary = summary['USD'] || { totalDebit: 0, totalCredit: 0, balance: 0 }

    return (
        <div className="space-y-8">
            <div>
                <h2 className="text-3xl font-bold tracking-tight text-slate-800">Dashboard</h2>
                <p className="text-slate-500">Finansal duruma genel bakış</p>
            </div>

            {/* Summary Cards */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Toplam Alacak (TL)</CardTitle>
                        <ArrowDownCircle className="h-4 w-4 text-emerald-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{tlSummary.totalDebit.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })}</div>
                        <p className="text-xs text-muted-foreground">Müşterilerden alacaklarımız</p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Toplam Borç (TL)</CardTitle>
                        <ArrowUpCircle className="h-4 w-4 text-rose-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{tlSummary.totalCredit.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })}</div>
                        <p className="text-xs text-muted-foreground">Tedarikçilere borçlarımız</p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Net Nakit Durumu (TL)</CardTitle>
                        <Wallet className="h-4 w-4 text-blue-500" />
                    </CardHeader>
                    <CardContent>
                        <div className={`text-2xl font-bold ${tlSummary.balance >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                            {tlSummary.balance.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })}
                        </div>
                        <p className="text-xs text-muted-foreground">Genel bakiye (Alacaklar - Borçlar)</p>
                    </CardContent>
                </Card>

                <Card className="bg-slate-900 text-white border-none">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-slate-100">Döviz Durumu (USD)</CardTitle>
                        <DollarSign className="h-4 w-4 text-emerald-400" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
                            {usdSummary.balance.toLocaleString('en-US', { style: 'currency', currency: 'USD' })}
                        </div>
                        <div className="flex justify-between text-xs mt-2 text-slate-400">
                            <span>Alacak: {usdSummary.totalDebit}</span>
                            <span>Borç: {usdSummary.totalCredit}</span>
                        </div>
                    </CardContent>
                </Card>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
                <Card className="col-span-4">
                    <CardHeader>
                        <CardTitle>En Yüksek Bakiyeli Müşteriler (Borçlular)</CardTitle>
                    </CardHeader>
                    <CardContent className="pl-2">
                        <div className="h-[300px] w-full">
                            {data?.topDebtors?.length > 0 ? (
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={data.topDebtors}>
                                        <XAxis dataKey="title" fontSize={12} tickLine={false} axisLine={false} />
                                        <YAxis fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `₺${value}`} />
                                        <Tooltip />
                                        <Bar dataKey="balances.TL" fill="#10b981" radius={[4, 4, 0, 0]} name="Bakiye (TL)" />
                                    </BarChart>
                                </ResponsiveContainer>
                            ) : (
                                <div className="flex items-center justify-center h-full text-slate-400">Veri yok</div>
                            )}
                        </div>
                    </CardContent>
                </Card>

                <Card className="col-span-3">
                    <CardHeader>
                        <CardTitle>Alacaklı Tedarikçiler</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            {data?.topCreditors?.map((creditor: any) => (
                                <div key={creditor.id} className="flex items-center">
                                    <div className="ml-4 space-y-1">
                                        <p className="text-sm font-medium leading-none">{creditor.title}</p>
                                        <p className="text-sm text-muted-foreground">{creditor.type}</p>
                                    </div>
                                    <div className="ml-auto font-medium text-rose-600">
                                        {creditor.balances?.TL?.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })}
                                    </div>
                                </div>
                            ))}
                            {!data?.topCreditors?.length && <p className="text-slate-400 text-sm">Veri yok</p>}
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}
