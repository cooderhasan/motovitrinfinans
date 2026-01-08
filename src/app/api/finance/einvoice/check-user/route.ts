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

        const debugLog: any[] = []
        let finalData = null
        let isEInvoice = false

        // Strategy: Try endpoints in order until one returns 200 and data
        // Docs say: GET /v1/users/{identifier}/{aliasType} (aliasType: All, Pk, Gb)
        const endpointsToTry = [
            `${apiUrl}einvoice/v1/users/${vkn}/All`,
            `${apiUrl}einvoice/v1/users/${vkn}/Pk`,
            `${apiUrl}einvoice/v1/registeredusers/${vkn}`, // Legacy try
            `${apiUrl}einvoice/v1/registeredusers?identifier=${vkn}`
        ]

        for (const url of endpointsToTry) {
            try {
                const res = await fetch(url, {
                    headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' }
                })

                const text = await res.text()
                let json = null
                try { json = JSON.parse(text) } catch (e) { }

                debugLog.push({ url, status: res.status, response: json || text })

                if (res.ok && json) {
                    // Check if json has valid user data
                    // Access nested data if necessary
                    let userData = json
                    if (Array.isArray(userData)) userData = userData[0]
                    else if (userData.data) {
                        if (Array.isArray(userData.data)) userData = userData.data[0]
                        else userData = userData.data
                    }

                    if (userData && (userData.identifier || userData.vknTckn || userData.title)) {
                        finalData = userData
                        isEInvoice = true
                        break // Found it!
                    }
                }
            } catch (err: any) {
                debugLog.push({ url, error: err.message })
            }
        }

        if (isEInvoice && finalData) {
            return NextResponse.json({
                isEInvoiceUser: true,
                type: 'E-INVOICE',
                title: finalData.title,
                aliases: finalData.aliases || [],
                message: 'E-Fatura mükellefi',
                debug: debugLog
            })
        }

        // Default to E-Archive
        return NextResponse.json({
            isEInvoiceUser: false,
            type: 'E-ARCHIVE',
            message: 'E-Fatura mükellefi değil (veya bulunamadı)',
            debug: debugLog
        })

    } catch (error) {
        console.error('User check error:', error)
        return NextResponse.json({ error: 'Sunucu hatası' }, { status: 500 })
    }
}
