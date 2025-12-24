import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

// Default settings
const defaultSettings: Record<string, string> = {
    siteTitle: 'Finans ERP',
    siteDescription: 'Finansal Yonetim Sistemi',
    faviconUrl: '/favicon.ico'
}

// GET /api/settings
export async function GET() {
    try {
        const settings = await db.settings.findMany()

        // Convert to object
        const settingsObj: Record<string, string> = { ...defaultSettings }
        settings.forEach(s => {
            if (s.value) settingsObj[s.key] = s.value
        })

        return NextResponse.json(settingsObj)
    } catch (error) {
        console.error('Settings fetch error:', error)
        // Return defaults if table doesn't exist yet
        return NextResponse.json(defaultSettings)
    }
}

// PUT /api/settings
export async function PUT(request: Request) {
    try {
        const body = await request.json()

        // Update each setting
        const updates = Object.entries(body).map(async ([key, value]) => {
            await db.settings.upsert({
                where: { key },
                update: { value: value as string },
                create: { key, value: value as string }
            })
        })

        await Promise.all(updates)

        return NextResponse.json({ success: true })
    } catch (error) {
        console.error('Settings update error:', error)
        return NextResponse.json({ error: 'Ayarlar guncellenirken hata olustu' }, { status: 500 })
    }
}
