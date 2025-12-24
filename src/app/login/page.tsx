'use client'

import { Suspense, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Lock, AlertCircle, TrendingUp, Shield, BarChart3 } from 'lucide-react'

function LoginForm() {
    const router = useRouter()
    const searchParams = useSearchParams()
    const [password, setPassword] = useState('')
    const [error, setError] = useState('')
    const [loading, setLoading] = useState(false)

    const redirectTo = searchParams.get('redirect') || '/dashboard'

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setError('')
        setLoading(true)

        try {
            const res = await fetch('/api/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ password })
            })

            if (res.ok) {
                router.push(redirectTo)
                router.refresh()
            } else {
                const data = await res.json()
                setError(data.error || 'Giris basarisiz')
            }
        } catch (err) {
            setError('Bir hata olustu')
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="min-h-screen flex">
            {/* Sol Panel - Branding */}
            <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white flex-col justify-between p-12">
                <div>
                    <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-400 to-cyan-300 text-transparent bg-clip-text">
                        Finans ERP
                    </h1>
                    <p className="text-slate-400 mt-2">Kurumsal Finans Yonetimi</p>
                </div>

                <div className="space-y-8">
                    <div className="flex items-start gap-4">
                        <div className="p-3 bg-blue-500/20 rounded-lg">
                            <TrendingUp className="h-6 w-6 text-blue-400" />
                        </div>
                        <div>
                            <h3 className="font-semibold text-lg">Cari Takibi</h3>
                            <p className="text-slate-400 text-sm">Musteri, tedarikci ve personel hesaplarini tek panelden yonetin.</p>
                        </div>
                    </div>

                    <div className="flex items-start gap-4">
                        <div className="p-3 bg-emerald-500/20 rounded-lg">
                            <BarChart3 className="h-6 w-6 text-emerald-400" />
                        </div>
                        <div>
                            <h3 className="font-semibold text-lg">Detayli Raporlar</h3>
                            <p className="text-slate-400 text-sm">Cari ekstre, gelir-gider ve bakiye raporlari oluşturun.</p>
                        </div>
                    </div>

                    <div className="flex items-start gap-4">
                        <div className="p-3 bg-purple-500/20 rounded-lg">
                            <Shield className="h-6 w-6 text-purple-400" />
                        </div>
                        <div>
                            <h3 className="font-semibold text-lg">Guvenli Erisim</h3>
                            <p className="text-slate-400 text-sm">Sifre korumalı, guvenli finansal veri yonetimi.</p>
                        </div>
                    </div>
                </div>

                <div className="text-slate-500 text-sm">
                    © 2024 Finans ERP. Tum haklari saklidir.
                </div>
            </div>

            {/* Sag Panel - Login Form */}
            <div className="flex-1 flex items-center justify-center p-8 bg-slate-50">
                <div className="w-full max-w-md">
                    {/* Mobile Logo */}
                    <div className="lg:hidden text-center mb-8">
                        <h1 className="text-2xl font-bold text-slate-800">Finans ERP</h1>
                        <p className="text-slate-500">Kurumsal Finans Yonetimi</p>
                    </div>

                    <div className="bg-white rounded-2xl shadow-xl p-8 border border-slate-200">
                        <div className="text-center mb-8">
                            <div className="mx-auto mb-4 w-16 h-16 bg-gradient-to-br from-blue-500 to-cyan-400 rounded-2xl flex items-center justify-center shadow-lg">
                                <Lock className="h-8 w-8 text-white" />
                            </div>
                            <h2 className="text-2xl font-bold text-slate-800">Hos Geldiniz</h2>
                            <p className="text-slate-500 mt-1">Devam etmek icin sifrenizi girin</p>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-6">
                            {error && (
                                <div className="flex items-center gap-3 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
                                    <AlertCircle className="h-5 w-5 flex-shrink-0" />
                                    <span>{error}</span>
                                </div>
                            )}

                            <div>
                                <label htmlFor="password" className="block text-sm font-medium text-slate-700 mb-2">
                                    Sifre
                                </label>
                                <input
                                    id="password"
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder="••••••••"
                                    required
                                    autoFocus
                                    className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all outline-none text-lg"
                                />
                            </div>

                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full py-3 px-4 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600 text-white font-semibold rounded-xl shadow-lg shadow-blue-500/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {loading ? (
                                    <span className="flex items-center justify-center gap-2">
                                        <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                        </svg>
                                        Giris Yapiliyor...
                                    </span>
                                ) : 'Giris Yap'}
                            </button>
                        </form>
                    </div>

                    <p className="text-center text-slate-400 text-sm mt-6">
                        Finans ERP v1.0.0
                    </p>
                </div>
            </div>
        </div>
    )
}

export default function LoginPage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen flex items-center justify-center bg-slate-50">
                <div className="animate-pulse text-slate-400">Yukleniyor...</div>
            </div>
        }>
            <LoginForm />
        </Suspense>
    )
}
