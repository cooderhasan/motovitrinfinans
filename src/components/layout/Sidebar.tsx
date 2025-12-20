
import Link from 'next/link'
import { LayoutDashboard, Users, FileText, CreditCard, BarChart3, Settings } from 'lucide-react'

const menuItems = [
    { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
    { name: 'Cariler', href: '/finance/caries', icon: Users },
    { name: 'Fatura & Satış', href: '/finance/invoices', icon: FileText },
    { name: 'Kasa & Ödeme', href: '/finance/payments', icon: CreditCard },
    { name: 'Raporlar', href: '/finance/reports', icon: BarChart3 },
]

export function Sidebar() {
    return (
        <div className="h-screen w-64 bg-slate-900 text-white flex flex-col fixed left-0 top-0">
            <div className="p-6 border-b border-slate-700">
                <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-cyan-300 text-transparent bg-clip-text">
                    Finans ERP
                </h1>
                <p className="text-xs text-slate-400 mt-1">Muhasebe & Finans</p>
            </div>

            <nav className="flex-1 p-4 space-y-2">
                {menuItems.map((item) => (
                    <Link
                        key={item.href}
                        href={item.href}
                        className="flex items-center gap-3 px-4 py-3 text-slate-300 hover:bg-slate-800 hover:text-white rounded-lg transition-colors"
                    >
                        <item.icon size={20} />
                        <span>{item.name}</span>
                    </Link>
                ))}
            </nav>

            <div className="p-4 border-t border-slate-700">
                <Link
                    href="/settings"
                    className="flex items-center gap-3 px-4 py-3 text-slate-400 hover:text-white transition-colors"
                >
                    <Settings size={20} />
                    <span>Ayarlar</span>
                </Link>
                <div className="mt-4 px-4">
                    <div className="text-xs text-slate-500">v1.0.0 Alpha</div>
                </div>
            </div>
        </div>
    )
}
