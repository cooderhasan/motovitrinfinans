'use client'

import { useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'

export function DynamicHead() {
    const [settings, setSettings] = useState<any>(null)
    const pathname = usePathname()

    useEffect(() => {
        // Login sayfasinda ayar yukleme
        if (pathname === '/login') return

        // Fetch settings
        fetch('/api/settings')
            .then(res => res.json())
            .then(data => {
                setSettings(data)

                // Update favicon
                if (data.faviconUrl) {
                    const existingFavicon = document.querySelector("link[rel='icon']")
                    if (existingFavicon) {
                        existingFavicon.setAttribute('href', data.faviconUrl)
                    } else {
                        const link = document.createElement('link')
                        link.rel = 'icon'
                        link.href = data.faviconUrl
                        document.head.appendChild(link)
                    }
                }

                // Update title
                if (data.siteTitle) {
                    document.title = data.siteTitle
                }
            })
            .catch(err => console.error('Failed to load settings:', err))
    }, [])

    return null
}
