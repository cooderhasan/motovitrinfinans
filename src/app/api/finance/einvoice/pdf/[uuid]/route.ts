import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

// GET /api/finance/einvoice/pdf/[uuid]
// NES API'den fatura PDF'ini çeker ve döner
export async function GET(
    request: Request,
    { params }: { params: Promise<{ uuid: string }> }
) {
    try {
        const { uuid } = await params

        // 1. Get API Settings
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
            return new NextResponse('API Anahtarı bulunamadı', { status: 400 })
        }

        // 2. Determine document type from query params
        const { searchParams } = new URL(request.url)
        const type = searchParams.get('type') || 'earchive' // 'earchive' or 'einvoice'
        const direction = searchParams.get('direction') || 'outgoing' // 'incoming' or 'outgoing'

        // 3. Build endpoint URL based on type
        let pdfUrl: string

        if (type === 'earchive') {
            // E-Arşiv: /v1/invoices/{uuid}/pdf
            pdfUrl = `${apiUrl}earchive/v1/invoices/${uuid}/pdf`
        } else {
            // E-Fatura: /v1/incoming|outgoing/invoices/{uuid}/pdf
            pdfUrl = `${apiUrl}einvoice/v1/${direction}/invoices/${uuid}/pdf`
        }

        console.log('Fetching PDF from:', pdfUrl)

        // 4. Fetch PDF from NES
        const response = await fetch(pdfUrl, {
            headers: {
                'Authorization': `Bearer ${apiKey}`
            }
        })

        if (!response.ok) {
            const errorText = await response.text()
            console.error('NES PDF Error:', errorText)
            return new NextResponse(`PDF alınamadı: ${errorText}`, { status: response.status })
        }

        // 5. Get PDF content
        const pdfBuffer = await response.arrayBuffer()

        // 6. Return PDF with correct headers
        return new NextResponse(pdfBuffer, {
            headers: {
                'Content-Type': 'application/pdf',
                'Content-Disposition': `inline; filename="fatura-${uuid}.pdf"`,
            }
        })

    } catch (error) {
        console.error('PDF Proxy error:', error)
        return new NextResponse('Sunucu hatası', { status: 500 })
    }
}
