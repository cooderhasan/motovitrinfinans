
import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { CurrencyCode, TransactionType } from '@prisma/client'

// GET /api/sales
// Tüm satış fişlerini listeler
export async function GET() {
    try {
        const salesSlips = await db.salesSlip.findMany({
            include: {
                customer: true,
                currency: true,
                items: true
            },
            orderBy: { slipDate: 'desc' },
            take: 50
        })
        return NextResponse.json(salesSlips)
    } catch (error) {
        console.error('Satış fişi listeleme hatası:', error)
        return NextResponse.json({ error: 'Satış fişleri listelenirken hata oluştu.' }, { status: 500 })
    }
}

// POST /api/sales
// Satış Fişi (Customer) Oluşturma
export async function POST(request: Request) {
    try {
        const body = await request.json()
        const {
            customerId,
            slipDate,
            currencyCode,
            exchangeRate,
            items
        } = body

        if (!customerId || !items || !items.length) {
            return NextResponse.json({ error: 'Müşteri ve ürün kalemleri zorunludur.' }, { status: 400 })
        }

        // 1. Kontroller
        const currency = await db.currency.findUnique({ where: { code: currencyCode as CurrencyCode } })
        if (!currency) return NextResponse.json({ error: 'Geçersiz para birimi.' }, { status: 400 })

        const customer = await db.cari.findUnique({ where: { id: customerId } })
        if (!customer || customer.type !== 'CUSTOMER') {
            return NextResponse.json({ error: 'Geçersiz müşteri.' }, { status: 400 })
        }

        // 2. Kur
        let finalExchangeRate = exchangeRate
        if (!finalExchangeRate) {
            if (currencyCode === 'TL') {
                finalExchangeRate = 1
            } else {
                const lastRate = await db.exchangeRate.findFirst({
                    where: { currencyId: currency.id },
                    orderBy: { rateDate: 'desc' }
                })
                finalExchangeRate = lastRate?.rate || 1
            }
        }

        // 3. Hesaplama
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

        // 4. TRANSACTION
        const result = await db.$transaction(async (tx) => {
            // A. Satış Fişini Kaydet
            const salesSlip = await tx.salesSlip.create({
                data: {
                    customerId: customer.id,
                    slipDate: new Date(slipDate),
                    currencyId: currency.id,
                    exchangeRate: finalExchangeRate,
                    totalAmount: totalAmount,
                    items: {
                        create: salesItemsData
                    }
                },
                include: { items: true }
            })

            // B. Cari Hareketi (CashTransaction)
            // Satış -> Müşteri BORÇLANIR (Debit)
            await tx.cashTransaction.create({
                data: {
                    cariId: customer.id,
                    transactionType: TransactionType.DEBIT, // Müşteri Borç
                    source: 'sales_slip',
                    sourceId: salesSlip.id,
                    amount: totalAmount,
                    currencyId: currency.id,
                    exchangeRate: finalExchangeRate,
                    transactionDate: new Date(slipDate)
                }
            })

            return salesSlip
        })

        return NextResponse.json(result, { status: 201 })

    } catch (error) {
        console.error('Satış fişi oluşturma hatası:', error)
        return NextResponse.json({ error: 'Satış fişi oluşturulurken bir hata oluştu.' }, { status: 500 })
    }
}
