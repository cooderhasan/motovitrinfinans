import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

// GET /api/finance/einvoice/debug-sync
export async function GET(request: Request) {
    try {
        const searchParams = new URL(request.url).searchParams

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

        // 2. Fetch Invoices
        const targetUuid = searchParams.get('uuid')
        let invoices = []

        if (targetUuid) {
            // Fetch specific invoice detail directly
            const response = await fetch(`${apiUrl}einvoice/v1/incoming/invoices/${targetUuid}`, {
                headers: { 'Authorization': `Bearer ${apiKey}` }
            })
            if (response.ok) {
                const detail = await response.json()
                // Wrap in array to reuse logic, but mark as detail
                invoices = [detail]
            } else {
                return NextResponse.json({ error: `UUID ile fatura bulunamadı: ${targetUuid}`, status: response.status })
            }
        } else {
            // Default fetch list
            const response = await fetch(`${apiUrl}einvoice/v1/incoming/invoices?pageSize=1`, {
                headers: { 'Authorization': `Bearer ${apiKey}` }
            })
            if (!response.ok) return NextResponse.json({ error: 'NES API Hatası', details: await response.text() })
            const data = await response.json()
            invoices = data.data || []
        }

        if (invoices.length === 0) return NextResponse.json({ message: 'Hiç fatura bulunamadı.' })

        const summaryInv = invoices[0]
        const uuid = summaryInv.uuid || summaryInv.id || summaryInv.ettn

        // 3. Probe for Lines (UBL/XML) if UUID exists
        let ublData = 'Denenmedi'
        if (uuid) {
            try {
                const ublRes = await fetch(`${apiUrl}einvoice/v1/incoming/invoices/${uuid}/ubl`, {
                    headers: { 'Authorization': `Bearer ${apiKey}` }
                })
                if (ublRes.ok) ublData = 'Mevcut (Text Length: ' + (await ublRes.text()).length + ')'
                else ublData = 'Hata: ' + ublRes.status + ' ' + ublRes.statusText
            } catch (e: any) { ublData = e.message }
        }

        // Return comparison
        return NextResponse.json({
            message: 'DETAYLI FATURA ANALIZI (UUID: ' + (uuid || 'Bilinmiyor') + ')',
            FULL_INVOICE_OBJECT: summaryInv,
            // Check where lines are hiding
            LINES_CHECK: {
                invoiceLine: summaryInv.invoiceLine ? `Mevcut (${summaryInv.invoiceLine.length})` : 'Yok',
                lines: summaryInv.lines ? `Mevcut (${summaryInv.lines.length})` : 'Yok',
                Lines: summaryInv.Lines ? `Mevcut (${summaryInv.Lines.length})` : 'Yok',
                // Deep search
                sampleLine: summaryInv.invoiceLine?.[0] || summaryInv.lines?.[0] || null
            },
            ublEndpointStatus: ublData
        })

    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
