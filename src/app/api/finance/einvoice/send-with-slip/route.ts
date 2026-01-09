import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

// POST /api/finance/einvoice/send-with-slip
// Satış fişi oluştur VE NES'e e-arşiv olarak gönder
export async function POST(request: Request) {
    try {
        const body = await request.json()
        const { customerId, recipient, settings: invSettings, items } = body

        // 1. Validations
        if (!customerId || !recipient.vkn || !items.length) {
            return NextResponse.json({ error: 'Eksik bilgi: Müşteri, VKN ve kalemler zorunludur.' }, { status: 400 })
        }

        // 2. Müşteri kontrolü
        const customer = await db.cari.findUnique({
            where: { id: parseInt(customerId) },
            include: { defaultCurrency: true }
        })

        if (!customer || customer.type !== 'CUSTOMER') {
            return NextResponse.json({ error: 'Geçersiz müşteri.' }, { status: 400 })
        }

        // 3. Para birimi
        const currency = customer.defaultCurrency
        const exchangeRate = 1 // TL için

        // 4. Toplam hesapla
        let totalAmount = 0
        const salesItemsData = items.map((item: any) => {
            const qty = parseFloat(item.quantity)
            const price = parseFloat(item.price)
            const lineTotal = qty * price
            totalAmount += lineTotal

            return {
                productName: item.name,
                quantity: qty,
                unitPrice: price,
                lineTotal: lineTotal
            }
        })

        // 5. Satış fişi oluştur (henüz UUID yok)
        const salesSlip = await db.salesSlip.create({
            data: {
                customerId: customer.id,
                slipDate: new Date(invSettings.date),
                currencyId: currency.id,
                exchangeRate: exchangeRate,
                totalAmount: totalAmount,
                sentToNes: false,
                items: {
                    create: salesItemsData
                }
            },
            include: {
                customer: true,
                currency: true,
                items: true
            }
        })

        // 6. NES'e gönder
        const nesResponse = await fetch(`${request.headers.get('origin')}/api/finance/einvoice/send`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Cookie': request.headers.get('cookie') || ''
            },
            body: JSON.stringify({
                recipient,
                settings: invSettings,
                items
            })
        })

        if (!nesResponse.ok) {
            const error = await nesResponse.json()
            // Satış fişi oluşturuldu ama NES'e gönderilemedi
            return NextResponse.json({
                error: 'Satış fişi kaydedildi ancak NES\'e gönderilemedi: ' + (error.error || 'Bilinmeyen hata'),
                salesSlipId: salesSlip.id,
                partialSuccess: true
            }, { status: 207 })
        }

        const nesData = await nesResponse.json()

        // 7. UUID'yi satış fişine kaydet
        const updatedSlip = await db.salesSlip.update({
            where: { id: salesSlip.id },
            data: {
                uuid: nesData.uuid,
                invoiceNumber: nesData.nesResponse?.documentNumber || null,
                sentToNes: true,
                sentAt: new Date(),
                invoiceType: invSettings.profile
            }
        })

        return NextResponse.json({
            success: true,
            uuid: nesData.uuid,
            salesSlipId: updatedSlip.id,
            invoiceNumber: updatedSlip.invoiceNumber,
            message: 'Satış fişi kaydedildi ve NES\'e gönderildi.'
        })

    } catch (error: any) {
        console.error('Send with slip error:', error)
        return NextResponse.json({ error: error.message || 'Gönderim hatası' }, { status: 500 })
    }
}
