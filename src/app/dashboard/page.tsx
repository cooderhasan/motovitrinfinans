'use client'

import { useQuery } from '@tanstack/react-query'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
    ArrowUpCircle,
    ArrowDownCircle,
    DollarSign,
    Wallet,
    TrendingUp,
    TrendingDown,
    Users,
    Building2,
    Sparkles
} from 'lucide-react'
import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Tooltip, Cell } from 'recharts'

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

    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="flex flex-col items-center gap-4">
                    <div className="w-12 h-12 border-4 border-blue-500/30 border-t-blue-500 rounded-full animate-spin"></div>
                    <p className="text-slate-500 animate-pulse">Yükleniyor...</p>
                </div>
            </div>
        )
    }

    const summary = data?.summary || {}
    const tlSummary = summary['TL'] || { totalDebit: 0, totalCredit: 0, balance: 0 }
    const usdSummary = summary['USD'] || { totalDebit: 0, totalCredit: 0, balance: 0 }

    const chartColors = ['#10b981', '#06b6d4', '#8b5cf6', '#f59e0b', '#ec4899']

    return (
        <div className="space-y-8 p-2">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <div className="flex items-center gap-3">
                        <div className="p-3 rounded-2xl bg-gradient-to-br from-blue-500 to-cyan-500 shadow-lg shadow-blue-500/30">
                            <Sparkles className="h-6 w-6 text-white" />
                        </div>
                        <div>
                            <h2 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-slate-800 to-slate-600 bg-clip-text text-transparent">
                                Dashboard
                            </h2>
                            <p className="text-slate-500">Finansal duruma genel bakış</p>
                        </div>
                    </div>
                </div>
                <div className="hidden md:flex items-center gap-2 px-4 py-2 rounded-full bg-slate-100 border border-slate-200">
                    <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
                    <span className="text-sm text-slate-600">Canlı Veri</span>
                </div>
            </div>

            {/* Summary Cards */}
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
                {/* Alacak Card */}
                <div className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 p-6 text-white shadow-xl shadow-emerald-500/20 transition-all duration-300 hover:shadow-2xl hover:shadow-emerald-500/30 hover:-translate-y-1">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2"></div>
                    <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/5 rounded-full translate-y-1/2 -translate-x-1/2"></div>
                    <div className="relative">
                        <div className="flex items-center justify-between mb-4">
                            <p className="text-emerald-100 text-sm font-medium">Toplam Alacak (TL)</p>
                            <div className="p-2 rounded-xl bg-white/20 backdrop-blur-sm">
                                <ArrowDownCircle className="h-5 w-5" />
                            </div>
                        </div>
                        <p className="text-3xl font-bold mb-2">
                            {tlSummary.totalDebit.toLocaleString('tr-TR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })} ₺
                        </p>
                        <div className="flex items-center gap-2 text-emerald-100 text-sm">
                            <TrendingUp className="h-4 w-4" />
                            <span>Müşterilerden alacak</span>
                        </div>
                    </div>
                </div>

                {/* Borç Card */}
                <div className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-rose-500 to-pink-600 p-6 text-white shadow-xl shadow-rose-500/20 transition-all duration-300 hover:shadow-2xl hover:shadow-rose-500/30 hover:-translate-y-1">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2"></div>
                    <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/5 rounded-full translate-y-1/2 -translate-x-1/2"></div>
                    <div className="relative">
                        <div className="flex items-center justify-between mb-4">
                            <p className="text-rose-100 text-sm font-medium">Toplam Borç (TL)</p>
                            <div className="p-2 rounded-xl bg-white/20 backdrop-blur-sm">
                                <ArrowUpCircle className="h-5 w-5" />
                            </div>
                        </div>
                        <p className="text-3xl font-bold mb-2">
                            {tlSummary.totalCredit.toLocaleString('tr-TR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })} ₺
                        </p>
                        <div className="flex items-center gap-2 text-rose-100 text-sm">
                            <TrendingDown className="h-4 w-4" />
                            <span>Tedarikçilere borç</span>
                        </div>
                    </div>
                </div>

                {/* Net Nakit Card */}
                <div className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 p-6 text-white shadow-xl shadow-blue-500/20 transition-all duration-300 hover:shadow-2xl hover:shadow-blue-500/30 hover:-translate-y-1">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2"></div>
                    <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/5 rounded-full translate-y-1/2 -translate-x-1/2"></div>
                    <div className="relative">
                        <div className="flex items-center justify-between mb-4">
                            <p className="text-blue-100 text-sm font-medium">Net Nakit Durumu</p>
                            <div className="p-2 rounded-xl bg-white/20 backdrop-blur-sm">
                                <Wallet className="h-5 w-5" />
                            </div>
                        </div>
                        <p className="text-3xl font-bold mb-2">
                            {tlSummary.balance.toLocaleString('tr-TR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })} ₺
                        </p>
                        <div className="flex items-center gap-2 text-blue-100 text-sm">
                            <Wallet className="h-4 w-4" />
                            <span>Alacak - Borç</span>
                        </div>
                    </div>
                </div>

                {/* USD Card */}
                <div className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-800 to-slate-900 p-6 text-white shadow-xl shadow-slate-800/30 transition-all duration-300 hover:shadow-2xl hover:shadow-slate-800/40 hover:-translate-y-1 border border-slate-700/50">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 rounded-full -translate-y-1/2 translate-x-1/2"></div>
                    <div className="absolute bottom-0 left-0 w-24 h-24 bg-emerald-500/5 rounded-full translate-y-1/2 -translate-x-1/2"></div>
                    <div className="relative">
                        <div className="flex items-center justify-between mb-4">
                            <p className="text-slate-400 text-sm font-medium">Döviz Durumu (USD)</p>
                            <div className="p-2 rounded-xl bg-emerald-500/20 backdrop-blur-sm">
                                <DollarSign className="h-5 w-5 text-emerald-400" />
                            </div>
                        </div>
                        <p className="text-3xl font-bold text-emerald-400 mb-2">
                            ${usdSummary.balance.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                        </p>
                        <div className="flex justify-between text-sm text-slate-400">
                            <span>Alacak: ${usdSummary.totalDebit}</span>
                            <span>Borç: ${usdSummary.totalCredit}</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Charts Section */}
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-7">
                {/* Borçlu Müşteriler Chart */}
                <Card className="col-span-4 border-0 shadow-xl shadow-slate-200/50 rounded-2xl overflow-hidden">
                    <CardHeader className="bg-gradient-to-r from-slate-50 to-white border-b border-slate-100">
                        <div className="flex items-center gap-3">
                            <div className="p-2 rounded-xl bg-emerald-100">
                                <Users className="h-5 w-5 text-emerald-600" />
                            </div>
                            <div>
                                <CardTitle className="text-lg">En Yüksek Bakiyeli Müşteriler</CardTitle>
                                <p className="text-sm text-slate-500">Borçlu müşteriler</p>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="pt-6">
                        <div className="h-[300px] w-full">
                            {data?.topDebtors?.length > 0 ? (
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={data.topDebtors} layout="vertical">
                                        <XAxis type="number" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `₺${value}`} />
                                        <YAxis type="category" dataKey="title" fontSize={11} tickLine={false} axisLine={false} width={120} />
                                        <Tooltip
                                            contentStyle={{
                                                borderRadius: '12px',
                                                border: 'none',
                                                boxShadow: '0 10px 40px rgba(0,0,0,0.1)'
                                            }}
                                        />
                                        <Bar dataKey="balances.TL" radius={[0, 8, 8, 0]} name="Bakiye (TL)">
                                            {data.topDebtors.map((entry: any, index: number) => (
                                                <Cell key={`cell-${index}`} fill={chartColors[index % chartColors.length]} />
                                            ))}
                                        </Bar>
                                    </BarChart>
                                </ResponsiveContainer>
                            ) : (
                                <div className="flex flex-col items-center justify-center h-full text-slate-400">
                                    <Users className="h-12 w-12 mb-3 opacity-30" />
                                    <p>Henüz veri yok</p>
                                </div>
                            )}
                        </div>
                    </CardContent>
                </Card>

                {/* Alacaklı Tedarikçiler */}
                <Card className="col-span-3 border-0 shadow-xl shadow-slate-200/50 rounded-2xl overflow-hidden">
                    <CardHeader className="bg-gradient-to-r from-slate-50 to-white border-b border-slate-100">
                        <div className="flex items-center gap-3">
                            <div className="p-2 rounded-xl bg-rose-100">
                                <Building2 className="h-5 w-5 text-rose-600" />
                            </div>
                            <div>
                                <CardTitle className="text-lg">Alacaklı Tedarikçiler</CardTitle>
                                <p className="text-sm text-slate-500">Ödeme bekleyenler</p>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="pt-4">
                        <div className="space-y-3">
                            {data?.topCreditors?.map((creditor: any, index: number) => (
                                <div
                                    key={creditor.id}
                                    className="flex items-center p-3 rounded-xl bg-slate-50 hover:bg-slate-100 transition-colors group"
                                >
                                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-rose-500 to-pink-500 flex items-center justify-center text-white font-bold shadow-lg shadow-rose-500/30">
                                        {creditor.title.charAt(0)}
                                    </div>
                                    <div className="ml-3 flex-1">
                                        <p className="text-sm font-semibold text-slate-800">{creditor.title}</p>
                                        <p className="text-xs text-slate-500">{creditor.type === 'SUPPLIER' ? 'Tedarikçi' : creditor.type}</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="font-bold text-rose-600">
                                            {creditor.balances?.TL?.toLocaleString('tr-TR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })} ₺
                                        </p>
                                    </div>
                                </div>
                            ))}
                            {!data?.topCreditors?.length && (
                                <div className="flex flex-col items-center justify-center py-8 text-slate-400">
                                    <Building2 className="h-12 w-12 mb-3 opacity-30" />
                                    <p>Henüz veri yok</p>
                                </div>
                            )}
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}
