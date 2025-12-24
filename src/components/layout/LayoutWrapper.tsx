'use client'

import { usePathname } from 'next/navigation'
import { Sidebar } from './Sidebar'

export function LayoutWrapper({ children }: { children: React.ReactNode }) {
    const pathname = usePathname()

    // Login sayfasinda sidebar ve wrapper'i gosterme
    if (pathname === '/login') {
        return <>{children}</>
    }

    return (
        <div className="flex min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100">
            <Sidebar />
            <main className="flex-1 md:ml-72 p-4 md:p-8 overflow-y-auto min-h-screen pt-16 md:pt-8">
                {children}
            </main>
        </div>
    )
}
