import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

// GET /api/finance/einvoice/html/[uuid]
// NES API'den fatura HTML görüntüsünü çeker
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

        const { searchParams } = new URL(request.url)
        const type = searchParams.get('type') || 'einvoice' // 'einvoice' or 'earchive'
        const direction = searchParams.get('direction') || 'outgoing' // 'incoming' or 'outgoing'

        // 2. Fetch HTML from NES
        let htmlUrl: string

        if (type === 'earchive') {
            // E-Arşiv: /earchive/v1/invoices/{uuid}/html
            htmlUrl = `${apiUrl}earchive/v1/invoices/${uuid}/html`
        } else {
            // E-Fatura: /einvoice/v1/incoming|outgoing/invoices/{uuid}/html
            htmlUrl = `${apiUrl}einvoice/v1/${direction}/invoices/${uuid}/html`
        }

        const response = await fetch(htmlUrl, {
            headers: {
                'Authorization': `Bearer ${apiKey}`
            }
        })

        if (!response.ok) {
            console.error('NES PDF Error:', await response.text())
            // Fallback for demo/testing or if actual PDF fails
            return new NextResponse(`
                <html>
                    <body style="font-family: sans-serif; display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100vh; background: #f1f5f9;">
                        <h2 style="color: #64748b;">Fatura Görüntülenemedi</h2>
                        <p>NES API'den fatura görüntüsü alınırken hata oluştu.</p>
                        <p style="font-family: monospace; background: #e2e8f0; padding: 10px; border-radius: 6px;">UUID: ${uuid}</p>
                    </body>
                </html>
            `, { headers: { 'Content-Type': 'text/html' } })
        }

        // 3. Return HTML with correct headers
        const htmlContent = await response.text()

        return new NextResponse(htmlContent, {
            headers: {
                'Content-Type': 'text/html; charset=utf-8'
            }
        })

    } catch (error) {
        console.error('PDF Proxy error:', error)
        return new NextResponse('Sunucu hatası', { status: 500 })
    }
}
