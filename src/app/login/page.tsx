'use client'

import { Suspense, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Lock, AlertCircle, TrendingUp, Shield, BarChart3, Eye, EyeOff, Sparkles } from 'lucide-react'

function LoginForm() {
    const router = useRouter()
    const searchParams = useSearchParams()
    const [password, setPassword] = useState('')
    const [showPassword, setShowPassword] = useState(false)
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
            {/* Sol Panel - Premium Branding */}
            <div className="hidden lg:flex lg:w-[55%] relative overflow-hidden">
                {/* Gradient Background */}
                <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900" />

                {/* Animated Gradient Orbs */}
                <div className="absolute top-20 left-20 w-72 h-72 bg-blue-500/30 rounded-full blur-[100px] animate-pulse" />
                <div className="absolute bottom-20 right-20 w-96 h-96 bg-cyan-500/20 rounded-full blur-[120px] animate-pulse" style={{ animationDelay: '1s' }} />
                <div className="absolute top-1/2 left-1/2 w-64 h-64 bg-purple-500/20 rounded-full blur-[80px] animate-pulse" style={{ animationDelay: '2s' }} />

                {/* Grid Pattern Overlay */}
                <div className="absolute inset-0 opacity-10" style={{
                    backgroundImage: 'linear-gradient(rgba(255,255,255,.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.1) 1px, transparent 1px)',
                    backgroundSize: '50px 50px'
                }} />

                {/* Content */}
                <div className="relative z-10 flex flex-col justify-between p-12 text-white w-full">
                    <div>
                        <div className="flex items-center gap-3 mb-2">
                            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-400 to-cyan-400 flex items-center justify-center">
                                <Sparkles className="w-5 h-5 text-white" />
                            </div>
                            <h1 className="text-3xl font-bold">
                                <span className="bg-gradient-to-r from-blue-400 via-cyan-300 to-blue-400 text-transparent bg-clip-text">
                                    Finans ERP
                                </span>
                            </h1>
                        </div>
                        <p className="text-blue-200/70 text-lg ml-[52px]">Kurumsal Finans Yonetimi</p>
                    </div>

                    <div className="space-y-6 max-w-md">
                        <FeatureCard
                            icon={<TrendingUp className="h-5 w-5" />}
                            iconBg="from-blue-500 to-blue-600"
                            title="Cari Takibi"
                            description="Musteri, tedarikci ve personel hesaplarini tek panelden yonetin."
                        />
                        <FeatureCard
                            icon={<BarChart3 className="h-5 w-5" />}
                            iconBg="from-emerald-500 to-emerald-600"
                            title="Detayli Raporlar"
                            description="Cari ekstre, gelir-gider ve bakiye raporlari olusturun."
                        />
                        <FeatureCard
                            icon={<Shield className="h-5 w-5" />}
                            iconBg="from-purple-500 to-purple-600"
                            title="Guvenli Erisim"
                            description="Sifre korumali, guvenli finansal veri yonetimi."
                        />
                    </div>

                    <div className="text-blue-300/50 text-sm">
                        © 2024 Finans ERP. Tum haklari saklidir.
                    </div>
                </div>
            </div>

            {/* Sag Panel - Login Form */}
            <div className="flex-1 flex items-center justify-center p-6 bg-gradient-to-br from-slate-50 to-slate-100">
                <div className="w-full max-w-md">
                    {/* Mobile Logo */}
                    <div className="lg:hidden text-center mb-10">
                        <div className="inline-flex items-center gap-2 mb-2">
                            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center">
                                <Sparkles className="w-5 h-5 text-white" />
                            </div>
                            <h1 className="text-2xl font-bold text-slate-800">Finans ERP</h1>
                        </div>
                        <p className="text-slate-500">Kurumsal Finans Yonetimi</p>
                    </div>

                    <div className="bg-white rounded-3xl shadow-2xl shadow-slate-200/50 p-8 md:p-10 border border-slate-100">
                        <div className="text-center mb-8">
                            <div className="mx-auto mb-5 w-20 h-20 bg-gradient-to-br from-blue-500 via-blue-600 to-cyan-500 rounded-2xl flex items-center justify-center shadow-xl shadow-blue-500/30 rotate-3 hover:rotate-0 transition-transform duration-300">
                                <Lock className="h-9 w-9 text-white" />
                            </div>
                            <h2 className="text-2xl font-bold text-slate-800">Hos Geldiniz</h2>
                            <p className="text-slate-500 mt-2">Devam etmek icin sifrenizi girin</p>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-6">
                            {error && (
                                <div className="flex items-center gap-3 p-4 bg-red-50 border border-red-100 rounded-2xl text-red-600 text-sm animate-shake">
                                    <AlertCircle className="h-5 w-5 flex-shrink-0" />
                                    <span>{error}</span>
                                </div>
                            )}

                            <div>
                                <label htmlFor="password" className="block text-sm font-semibold text-slate-700 mb-2">
                                    Sifre
                                </label>
                                <div className="relative">
                                    <input
                                        id="password"
                                        type={showPassword ? 'text' : 'password'}
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        placeholder="••••••••"
                                        required
                                        autoFocus
                                        className="w-full px-5 py-4 pr-12 border-2 border-slate-200 rounded-xl focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 transition-all outline-none text-lg bg-slate-50/50 hover:border-slate-300"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors p-1"
                                    >
                                        {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                                    </button>
                                </div>
                            </div>

                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full py-4 px-6 bg-gradient-to-r from-blue-600 via-blue-600 to-cyan-600 hover:from-blue-700 hover:via-blue-700 hover:to-cyan-700 text-white font-semibold rounded-xl shadow-lg shadow-blue-500/30 hover:shadow-xl hover:shadow-blue-500/40 transition-all disabled:opacity-60 disabled:cursor-not-allowed transform hover:-translate-y-0.5 active:translate-y-0"
                            >
                                {loading ? (
                                    <span className="flex items-center justify-center gap-3">
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

                    <p className="text-center text-slate-400 text-sm mt-8">
                        Finans ERP v1.0.0
                    </p>
                </div>
            </div>
        </div>
    )
}

function FeatureCard({ icon, iconBg, title, description }: { icon: React.ReactNode, iconBg: string, title: string, description: string }) {
    return (
        <div className="flex items-start gap-4 p-4 rounded-2xl bg-white/5 backdrop-blur-sm border border-white/10 hover:bg-white/10 transition-colors group">
            <div className={`p-3 rounded-xl bg-gradient-to-br ${iconBg} shadow-lg group-hover:scale-110 transition-transform`}>
                {icon}
            </div>
            <div>
                <h3 className="font-semibold text-lg text-white">{title}</h3>
                <p className="text-blue-200/70 text-sm mt-1">{description}</p>
            </div>
        </div>
    )
}

export default function LoginPage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100">
                <div className="flex items-center gap-3 text-slate-400">
                    <svg className="animate-spin h-6 w-6" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    <span>Yukleniyor...</span>
                </div>
            </div>
        }>
            <LoginForm />
        </Suspense>
    )
}
