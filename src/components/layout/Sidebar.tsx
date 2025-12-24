'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
    LayoutDashboard,
    Users,
    UserCheck,
    FileText,
    CreditCard,
    BarChart3,
    Settings,
    Menu,
    X,
    LogOut,
    ChevronRight
} from 'lucide-react'

const menuItems = [
    { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard, color: 'from-blue-500 to-cyan-500' },
    { name: 'Cariler', href: '/finance/caries', icon: Users, color: 'from-violet-500 to-purple-500' },
    { name: 'Personel', href: '/finance/personnel', icon: UserCheck, color: 'from-emerald-500 to-teal-500' },
    { name: 'Fatura & Satış', href: '/finance/invoices', icon: FileText, color: 'from-orange-500 to-amber-500' },
    { name: 'Kasa & Ödeme', href: '/finance/payments', icon: CreditCard, color: 'from-pink-500 to-rose-500' },
    { name: 'Raporlar', href: '/finance/reports', icon: BarChart3, color: 'from-indigo-500 to-blue-500' },
]

export function Sidebar() {
    const [isOpen, setIsOpen] = useState(false)
    const [siteSettings, setSiteSettings] = useState({ siteTitle: 'Finans ERP', logoUrl: '' })
    const pathname = usePathname()

    // Fetch settings for logo and title
    useEffect(() => {
        fetch('/api/settings')
            .then(res => res.json())
            .then(data => {
                setSiteSettings({
                    siteTitle: data.siteTitle || 'Finans ERP',
                    logoUrl: data.logoUrl || ''
                })
            })
            .catch(() => { })
    }, [])

    // Login sayfasinda sidebar gosterme
    if (pathname === '/login') {
        return null
    }

    return (
        <>
            {/* Mobile menu button */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="md:hidden fixed top-4 left-4 z-50 p-3 bg-gradient-to-r from-slate-800 to-slate-900 text-white rounded-xl shadow-lg shadow-slate-900/50 backdrop-blur-sm border border-slate-700/50 transition-all duration-300 hover:scale-105"
            >
                {isOpen ? <X size={22} /> : <Menu size={22} />}
            </button>

            {/* Overlay for mobile */}
            {isOpen && (
                <div
                    className="md:hidden fixed inset-0 bg-black/60 backdrop-blur-sm z-30 animate-fadeIn"
                    onClick={() => setIsOpen(false)}
                />
            )}

            {/* Sidebar */}
            <div className={`
                h-screen w-72 flex flex-col fixed left-0 top-0 z-40
                bg-gradient-to-b from-slate-900 via-slate-900 to-slate-950
                transform transition-all duration-500 ease-out
                ${isOpen ? 'translate-x-0' : '-translate-x-full'}
                md:translate-x-0
                border-r border-slate-800/50
                shadow-2xl shadow-slate-900/50
            `}>
                {/* Header with Logo */}
                <div className="p-6 border-b border-slate-800/50">
                    <div className="flex items-center gap-3">
                        {siteSettings.logoUrl ? (
                            <img
                                src={siteSettings.logoUrl}
                                alt={siteSettings.siteTitle}
                                className="h-10 max-w-[180px] object-contain"
                            />
                        ) : (
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-400 flex items-center justify-center shadow-lg shadow-blue-500/30">
                                    <LayoutDashboard size={22} className="text-white" />
                                </div>
                                <div>
                                    <h1 className="text-xl font-bold bg-gradient-to-r from-blue-400 via-cyan-300 to-teal-400 text-transparent bg-clip-text">
                                        {siteSettings.siteTitle}
                                    </h1>
                                    <p className="text-[10px] text-slate-500 uppercase tracking-widest">Muhasebe & Finans</p>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Navigation */}
                <nav className="flex-1 px-4 py-6 space-y-1.5 overflow-y-auto">
                    <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest px-4 mb-4">Ana Menü</p>
                    {menuItems.map((item) => {
                        const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                onClick={() => setIsOpen(false)}
                                className={`
                                    group flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300
                                    ${isActive
                                        ? `bg-gradient-to-r ${item.color} text-white shadow-lg shadow-slate-900/50`
                                        : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
                                    }
                                `}
                            >
                                <div className={`
                                    p-2 rounded-lg transition-all duration-300
                                    ${isActive
                                        ? 'bg-white/20'
                                        : `bg-slate-800 group-hover:bg-gradient-to-r group-hover:${item.color}`
                                    }
                                `}>
                                    <item.icon size={18} />
                                </div>
                                <span className="font-medium">{item.name}</span>
                                {isActive && (
                                    <ChevronRight size={16} className="ml-auto opacity-70" />
                                )}
                            </Link>
                        )
                    })}
                </nav>

                {/* Footer */}
                <div className="p-4 border-t border-slate-800/50 space-y-2">
                    <Link
                        href="/finance/settings"
                        onClick={() => setIsOpen(false)}
                        className={`
                            group flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300
                            ${pathname === '/finance/settings'
                                ? 'bg-slate-800 text-white'
                                : 'text-slate-500 hover:text-white hover:bg-slate-800/50'
                            }
                        `}
                    >
                        <div className="p-2 rounded-lg bg-slate-800 group-hover:bg-slate-700 transition-colors">
                            <Settings size={18} />
                        </div>
                        <span className="font-medium">Ayarlar</span>
                    </Link>

                    <button
                        onClick={async () => {
                            await fetch('/api/auth/login', { method: 'DELETE' })
                            window.location.href = '/login'
                        }}
                        className="group flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 w-full"
                    >
                        <div className="p-2 rounded-lg bg-slate-800 group-hover:bg-rose-500/20 transition-colors">
                            <LogOut size={18} />
                        </div>
                        <span className="font-medium">Çıkış Yap</span>
                    </button>

                    <div className="mt-4 px-4 py-3 rounded-xl bg-slate-800/50 border border-slate-700/50">
                        <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
                            <span className="text-xs text-slate-500">Sistem Aktif</span>
                        </div>
                        <div className="text-[10px] text-slate-600 mt-1">v1.0.0 Alpha</div>
                    </div>
                </div>
            </div>
        </>
    )
}
