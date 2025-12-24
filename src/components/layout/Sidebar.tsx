'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { LayoutDashboard, Users, UserCheck, FileText, CreditCard, BarChart3, Settings, Menu, X, LogOut } from 'lucide-react'

const menuItems = [
    { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
    { name: 'Cariler', href: '/finance/caries', icon: Users },
    { name: 'Personel', href: '/finance/personnel', icon: UserCheck },
    { name: 'Fatura & Satis', href: '/finance/invoices', icon: FileText },
    { name: 'Kasa & Odeme', href: '/finance/payments', icon: CreditCard },
    { name: 'Raporlar', href: '/finance/reports', icon: BarChart3 },
]

export function Sidebar() {
    const [isOpen, setIsOpen] = useState(false)
    const pathname = usePathname()

    // Login sayfasinda sidebar gosterme
    if (pathname === '/login') {
        return null
    }

    return (
        <>
            {/* Mobile menu button */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="md:hidden fixed top-4 left-4 z-50 p-2 bg-slate-900 text-white rounded-lg shadow-lg"
            >
                {isOpen ? <X size={24} /> : <Menu size={24} />}
            </button>

            {/* Overlay for mobile */}
            {isOpen && (
                <div
                    className="md:hidden fixed inset-0 bg-black/50 z-30"
                    onClick={() => setIsOpen(false)}
                />
            )}

            {/* Sidebar */}
            <div className={`
                h-screen w-64 bg-slate-900 text-white flex flex-col fixed left-0 top-0 z-40
                transform transition-transform duration-300
                ${isOpen ? 'translate-x-0' : '-translate-x-full'}
                md:translate-x-0
            `}>
                <div className="p-6 border-b border-slate-700">
                    <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-cyan-300 text-transparent bg-clip-text">
                        Finans ERP
                    </h1>
                    <p className="text-xs text-slate-400 mt-1">Muhasebe & Finans</p>
                </div>

                <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
                    {menuItems.map((item) => {
                        const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                onClick={() => setIsOpen(false)}
                                className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${isActive
                                    ? 'bg-blue-600 text-white'
                                    : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                                    }`}
                            >
                                <item.icon size={20} />
                                <span>{item.name}</span>
                            </Link>
                        )
                    })}
                </nav>

                <div className="p-4 border-t border-slate-700 space-y-2">
                    <Link
                        href="/finance/settings"
                        onClick={() => setIsOpen(false)}
                        className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${pathname === '/finance/settings'
                            ? 'bg-blue-600 text-white'
                            : 'text-slate-400 hover:text-white hover:bg-slate-800'
                            }`}
                    >
                        <Settings size={20} />
                        <span>Ayarlar</span>
                    </Link>
                    <button
                        onClick={async () => {
                            await fetch('/api/auth/login', { method: 'DELETE' })
                            window.location.href = '/login'
                        }}
                        className="flex items-center gap-3 px-4 py-3 rounded-lg transition-colors text-red-400 hover:text-white hover:bg-red-600 w-full"
                    >
                        <LogOut size={20} />
                        <span>Cikis Yap</span>
                    </button>
                    <div className="mt-2 px-4">
                        <div className="text-xs text-slate-500">v1.0.0 Alpha</div>
                    </div>
                </div>
            </div>
        </>
    )
}

