import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { CurrencyCode, TransactionType } from '@prisma/client'

// GET /api/sales/[id]
export async function GET(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params
        const salesSlip = await db.salesSlip.findUnique({
            where: { id: parseInt(id) },
            include: {
                customer: true,
                currency: true,
                items: true
            }
        })

        if (!salesSlip) {
            return NextResponse.json({ error: 'Satış fişi bulunamadı.' }, { status: 404 })
        }

        return NextResponse.json(salesSlip)
    } catch (error) {
        console.error('Satış fişi detay hatası:', error)
        return NextResponse.json({ error: 'Satış fişi bilgisi alınırken hata oluştu.' }, { status: 500 })
    }
}

// PUT /api/sales/[id]
export async function PUT(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params
        const salesId = parseInt(id)
        const body = await request.json()
        const { customerId, slipDate, currencyCode, items } = body

        // 1. Mevcut satış fişini bul
        const existingSale = await db.salesSlip.findUnique({
            where: { id: salesId },
            include: { items: true }
        })

        if (!existingSale) {
            return NextResponse.json({ error: 'Satış fişi bulunamadı.' }, { status: 404 })
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
        const salesItemsData = items.map((item: any) => {
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
                    source: 'sales_slip',
                    sourceId: salesId
                }
            })

            // B. Eski kalemleri sil
            await tx.salesItem.deleteMany({
                where: { salesSlipId: salesId }
            })

            // C. Satış fişini güncelle
            const updated = await tx.salesSlip.update({
                where: { id: salesId },
                data: {
                    customerId: customerId,
                    slipDate: new Date(slipDate),
                    currencyId: currency.id,
                    exchangeRate: exchangeRate,
                    totalAmount: totalAmount,
                    items: {
                        create: salesItemsData
                    }
                },
                include: { items: true }
            })

            // D. Yeni CashTransaction oluştur
            await tx.cashTransaction.create({
                data: {
                    cariId: customerId,
                    transactionType: TransactionType.DEBIT,
                    source: 'sales_slip',
                    sourceId: salesId,
                    amount: totalAmount,
                    currencyId: currency.id,
                    exchangeRate: exchangeRate,
                    transactionDate: new Date(slipDate)
                }
            })

            return updated
        })

        return NextResponse.json(result)
    } catch (error) {
        console.error('Satış fişi güncelleme hatası:', error)
        return NextResponse.json({ error: 'Satış fişi güncellenirken hata oluştu.' }, { status: 500 })
    }
}

// DELETE /api/sales/[id]
export async function DELETE(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params
        const salesId = parseInt(id)

        await db.$transaction(async (tx) => {
            // CashTransaction sil
            await tx.cashTransaction.deleteMany({
                where: {
                    source: 'sales_slip',
                    sourceId: salesId
                }
            })

            // Kalemleri sil
            await tx.salesItem.deleteMany({
                where: { salesSlipId: salesId }
            })

            // Satış fişini sil
            await tx.salesSlip.delete({
                where: { id: salesId }
            })
        })

        return NextResponse.json({ success: true })
    } catch (error) {
        console.error('Satış fişi silme hatası:', error)
        return NextResponse.json({ error: 'Satış fişi silinirken hata oluştu.' }, { status: 500 })
    }
}
