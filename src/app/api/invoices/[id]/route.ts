import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { CurrencyCode, TransactionType } from '@prisma/client'

// GET /api/invoices/[id]
export async function GET(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params
        const invoice = await db.invoice.findUnique({
            where: { id: parseInt(id) },
            include: {
                supplier: true,
                currency: true,
                items: true
            }
        })

        if (!invoice) {
            return NextResponse.json({ error: 'Fatura bulunamadı.' }, { status: 404 })
        }

        return NextResponse.json(invoice)
    } catch (error) {
        console.error('Fatura detay hatası:', error)
        return NextResponse.json({ error: 'Fatura bilgisi alınırken hata oluştu.' }, { status: 500 })
    }
}

// PUT /api/invoices/[id]
export async function PUT(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params
        const invoiceId = parseInt(id)
        const body = await request.json()
        const { supplierId, invoiceDate, currencyCode, items } = body

        // 1. Mevcut faturayı bul
        const existingInvoice = await db.invoice.findUnique({
            where: { id: invoiceId },
            include: { items: true }
        })

        if (!existingInvoice) {
            return NextResponse.json({ error: 'Fatura bulunamadı.' }, { status: 404 })
        }

        // 2. Para birimi kontrol
        const currency = await db.currency.findUnique({
            where: { code: currencyCode as CurrencyCode }
        })
        if (!currency) {
            return NextResponse.json({ error: 'Geçersiz para birimi.' }, { status: 400 })
        }

        // 3. Kur al
        let exchangeRate = 1
        if (currencyCode !== 'TL') {
            const lastRate = await db.exchangeRate.findFirst({
                where: { currencyId: currency.id },
                orderBy: { rateDate: 'desc' }
            })
            exchangeRate = lastRate?.rate?.toNumber() || 1
        }

        // 4. Yeni toplam hesapla
        let totalAmount = 0
        const invoiceItemsData = items.map((item: any) => {
            const lineTotal = item.quantity * item.unitPrice
            totalAmount += lineTotal
            return {
                productName: item.productName,
                quantity: item.quantity,
                unitPrice: item.unitPrice,
                lineTotal: lineTotal
            }
        })

        // 5. Transaction ile güncelle
        const result = await db.$transaction(async (tx) => {
            // A. Eski CashTransaction'ı sil
            await tx.cashTransaction.deleteMany({
                where: {
                    source: 'invoice',
                    sourceId: invoiceId
                }
            })

            // B. Eski kalemleri sil
            await tx.invoiceItem.deleteMany({
                where: { invoiceId: invoiceId }
            })

            // C. Faturayı güncelle
            const updated = await tx.invoice.update({
                where: { id: invoiceId },
                data: {
                    supplierId: supplierId,
                    invoiceDate: new Date(invoiceDate),
                    currencyId: currency.id,
                    exchangeRate: exchangeRate,
                    totalAmount: totalAmount,
                    items: {
                        create: invoiceItemsData
                    }
                },
                include: { items: true }
            })

            // D. Yeni CashTransaction oluştur
            await tx.cashTransaction.create({
                data: {
                    cariId: supplierId,
                    transactionType: TransactionType.CREDIT,
                    source: 'invoice',
                    sourceId: invoiceId,
                    amount: totalAmount,
                    currencyId: currency.id,
                    exchangeRate: exchangeRate,
                    transactionDate: new Date(invoiceDate)
                }
            })

            return updated
        })

        return NextResponse.json(result)
    } catch (error) {
        console.error('Fatura güncelleme hatası:', error)
        return NextResponse.json({ error: 'Fatura güncellenirken hata oluştu.' }, { status: 500 })
    }
}

// DELETE /api/invoices/[id]
export async function DELETE(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params
        const invoiceId = parseInt(id)

        await db.$transaction(async (tx) => {
            // CashTransaction sil
            await tx.cashTransaction.deleteMany({
                where: {
                    source: 'invoice',
                    sourceId: invoiceId
                }
            })

            // Kalemleri sil
            await tx.invoiceItem.deleteMany({
                where: { invoiceId: invoiceId }
            })

            // Faturayı sil
            await tx.invoice.delete({
                where: { id: invoiceId }
            })
        })

        return NextResponse.json({ success: true })
    } catch (error) {
        console.error('Fatura silme hatası:', error)
        return NextResponse.json({ error: 'Fatura silinirken hata oluştu.' }, { status: 500 })
    }
}
