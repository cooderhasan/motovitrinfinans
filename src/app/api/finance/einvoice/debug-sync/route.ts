
import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

// GET /api/finance/einvoice/debug-sync
export async function GET(request: Request) {
    try {
        // 1. Get Settings
        const settings = await db.settings.findMany({
            where: { key: { in: ['nesApiKey', 'nesApiUrl'] } }
        })

        const settingsMap = settings.reduce((acc: any, curr) => {
            acc[curr.key] = curr.value || ''
            return acc
        }, {})

        const apiKey = settingsMap['nesApiKey']
        const apiUrl = settingsMap['nesApiUrl'] || 'https://api.nes.com.tr/'

        if (!apiKey) {
            return NextResponse.json({ error: 'API Anahtarı bulunamadı' })
        }

        // 2. Fetch 1 Invoice
        const response = await fetch(`${apiUrl}einvoice/v1/incoming/invoices?pageSize=1`, {
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json'
            }
        })

        if (!response.ok) {
            return NextResponse.json({ error: 'NES API Hatası', details: await response.text() })
        }

        const data = await response.json()
        const invoices = data.data || []

        if (invoices.length === 0) {
            return NextResponse.json({ message: 'Hiç fatura bulunamadı.' })
        }

        // PROBE MODE: Test Outbound Endpoints
        const searchParams = new URL(request.url).searchParams
        if (searchParams.get('mode') === 'probe') {
            const candidates = [
                'einvoice/v1/outgoing/invoices/send',
                'einvoice/v1/e-fatura/olustur',
                'v1/fatura/olustur',
                'fatura/olustur',
                'invoice/create',
                'api/fatura/olustur',
                'einvoice/v1/ubl/send',

                // Root attempts (assuming apiUrl has trailing slash)
                'send',
                'create'
            ]

            const results: any = {}

            // 1. CHECk GET ALLOWED (To verify 405 logic)
            try {
                const getRes = await fetch(`${apiUrl}einvoice/v1/outgoing/invoices`, {
                    headers: { 'Authorization': `Bearer ${apiKey}` }
                })
                results['GET einvoice/v1/outgoing/invoices'] = getRes.status
            } catch (e: any) {
                results['GET outgoing error'] = e.message
            }

            // 2. CHECK POST Candidates
            for (const path of candidates) {
                try {
                    const res = await fetch(`${apiUrl}${path}`, {
                        method: 'POST',
                        headers: {
                            'Authorization': `Bearer ${apiKey}`,
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({ note: ["probe"] })
                    })
                    results[path] = res.status
                } catch (e: any) {
                    results[path] = e.message
                }
            }

            return NextResponse.json({
                message: 'Endpoint Probe Results (Look for 400 or 200, NOT 404/405)',
                results
            })
        }

        // ... existing logic for Invoice Detail ...
        const summaryInv = invoices[0]
        const uuid = summaryInv.uuid || summaryInv.id

        // 3. Probe for Lines (UBL/XML)
        let ublData = 'Denenmedi'
        const ublRes = await fetch(`${apiUrl}einvoice/v1/incoming/invoices/${uuid}/ubl`, {
            headers: { 'Authorization': `Bearer ${apiKey}` }
        })
        if (ublRes.ok) ublData = 'Mevcut (Text Length: ' + (await ublRes.text()).length + ')'
        else ublData = 'Hata: ' + ublRes.status

        // 4. Probe for JSON Model?
        let jsonModelData = 'Denenmedi'
        /*
        const modelRes = await fetch(`${apiUrl}einvoice/v1/incoming/invoices/${uuid}/model`, { ... })
        */

        // Return comparison
        return NextResponse.json({
            message: 'DETAYLI KOY ANALIZI',

            // DUMP EVERYTHING!
            // We need to see EXACTLY what fields are in the list object
            FULL_INVOICE_OBJECT: summaryInv,

            // 2. Lines might be in UBL
            ublEndpointStatus: ublData,

            // Check if Summary has lines?
            linesInSummary: summaryInv.lines || summaryInv.invoiceLine || 'Yok',
        })

    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
