
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
            message: 'Derin Analiz',

            // 1. Sender is definitely in Summary
            senderInSummary: summaryInv.accountingSupplierParty || 'Yok',

            // 2. Lines might be in UBL
            ublEndpointStatus: ublData,

            // Check if Summary has lines?
            linesInSummary: summaryInv.lines || summaryInv.invoiceLine || 'Yok',

            // Raw Summary
            summaryKeys: Object.keys(summaryInv)
        })

    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
