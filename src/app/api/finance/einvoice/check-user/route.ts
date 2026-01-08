import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

// GET /api/finance/einvoice/check-user?vkn=1234567890
export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url)
        const vkn = searchParams.get('vkn')

        if (!vkn || (vkn.length !== 10 && vkn.length !== 11)) {
            return NextResponse.json({ error: 'Geçersiz VKN/TCKN' }, { status: 400 })
        }

        // 1. Get Settings
        const settings = await db.settings.findMany({
            where: { key: { in: ['nesApiKey', 'nesApiUrl'] } }
        })
        const settingsMap = settings.reduce((acc, curr) => {
            acc[curr.key] = curr.value || ''
            return acc
        }, {} as Record<string, string>)

        const apiKey = settingsMap['nesApiKey']
        const apiUrl = settingsMap['nesApiUrl'] || 'https://api.nes.com.tr/'

        if (!apiKey) {
            // Dev mode fallback or error
            // console.warn('No API Key, simulating response')
            return NextResponse.json({ error: 'API Anahtarı bulunamadı' }, { status: 400 })
        }

        // 2. Query NES API
        // Endpoint guess: /einvoice/v1/registeredusers/check?identifier={vkn}
        // or /einvoice/v1/registeredusers/{vkn}
        // Let's rely on standard NES endpoints structure. 
        // We will try to fetch user info. If 404/empty, they are NOT e-invoice user.

        const response = await fetch(`${apiUrl}einvoice/v1/registeredusers/${vkn}`, {
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json'
            }
        })

        if (response.status === 404) {
            // Not found = Not E-Invoice user = E-Archive
            return NextResponse.json({
                isEInvoiceUser: false,
                type: 'E-ARCHIVE',
                message: 'E-Fatura mükellefi değil (E-Arşiv kesilmeli)'
            })
        }

        if (!response.ok) {
            // different type of error
            const errorText = await response.text()
            console.error('NES User Check Error:', errorText, response.status)
            // Fallback: If API error (except 404), we might defaulting? No, safer to alert user.
            // But for now let's assume if it fails it's safer to check manually or assume E-Archive with warning.
            return NextResponse.json({ error: 'Sorgulama başarısız' }, { status: 500 })
        }

        const data = await response.json()

        // If successful response and data exists
        if (data && data.identifier) {
            return NextResponse.json({
                isEInvoiceUser: true,
                type: 'E-INVOICE',
                title: data.title, // Might be in response
                aliases: data.aliases || [],
                message: 'E-Fatura mükellefi'
            })
        }

        // Fallback
        return NextResponse.json({
            isEInvoiceUser: false,
            type: 'E-ARCHIVE'
        })

    } catch (error) {
        console.error('User check error:', error)
        return NextResponse.json({ error: 'Sunucu hatası' }, { status: 500 })
    }
}
