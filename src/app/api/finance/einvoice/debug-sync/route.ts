
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

        // 3. Fetch Full Details
        const detailRes = await fetch(`${apiUrl}einvoice/v1/incoming/invoices/${uuid}`, {
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json'
            }
        })

        let detailInv = null
        if (detailRes.ok) {
            detailInv = await detailRes.json()
        }

        // Return comparison
        return NextResponse.json({
            message: 'Fatura Detay Analizi',
            summaryKeys: Object.keys(summaryInv),
            detailKeys: detailInv ? Object.keys(detailInv) : 'Detay Çekilemedi',

            // Check Sender in Detail
            senderInDetail: detailInv ? (detailInv.sender || detailInv.accountingSupplierParty) : 'Yok',

            // Check Lines in Detail
            linesInDetail: detailInv ? (detailInv.lines || detailInv.invoiceLine) : 'Yok',

            // Raw Check for nesting
            rawDetail: detailInv
        })

    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
