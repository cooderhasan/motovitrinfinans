
import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { CurrencyCode, TransactionType } from '@prisma/client'

// GET /api/invoices
// Tüm faturaları filtrelenmiş şekilde listeler
export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url)
        const startDate = searchParams.get('startDate')
        const endDate = searchParams.get('endDate')
        const supplierId = searchParams.get('supplierId')

        const where: any = {}

        if (startDate && endDate) {
            where.invoiceDate = {
                gte: new Date(startDate),
                lte: new Date(endDate)
            }
        } else if (startDate) {
            where.invoiceDate = { gte: new Date(startDate) }
        }

        if (supplierId && supplierId !== 'all') {
            where.supplierId = parseInt(supplierId)
        }

        const invoices = await db.invoice.findMany({
            where,
            include: {
                supplier: true,
                currency: true,
                items: true
            },
            orderBy: { invoiceDate: 'desc' },
            take: 100
        })
        return NextResponse.json(invoices)
    } catch (error) {
        console.error('Fatura listeleme hatası:', error)
        return NextResponse.json({ error: 'Faturalar listelenirken hata oluştu.' }, { status: 500 })
    }
}

// POST /api/invoices
// Alış Faturası (Supplier) Oluşturma
export async function POST(request: Request) {
    try {
        const body = await request.json()
        const {
            supplierId,
            invoiceDate,
            currencyCode,
            discountRate,
            exchangeRate, // Opsiyonel, gönderilmezse sistemden alınır
            items
        } = body

        if (!supplierId || !items || !items.length) {
            return NextResponse.json({ error: 'Tedarikçi ve ürün kalemleri zorunludur.' }, { status: 400 })
        }

        // 1. Para birimi ve cari kontrolü
        const currency = await db.currency.findUnique({ where: { code: currencyCode as CurrencyCode } })
        if (!currency) return NextResponse.json({ error: 'Geçersiz para birimi.' }, { status: 400 })

        const supplier = await db.cari.findUnique({ where: { id: supplierId } })
        if (!supplier || supplier.type !== 'SUPPLIER') {
            return NextResponse.json({ error: 'Geçersiz tedarikçi.' }, { status: 400 })
        }

        // 2. Kur Yönetimi
        // Eğer kur manuel girilmemişse, o günkü en son kuru veritabanından bulmaya çalış
        let finalExchangeRate = exchangeRate
        if (!finalExchangeRate) {
            // Sistemdeki son kur
            if (currencyCode === 'TL') {
                finalExchangeRate = 1
            } else {
                const lastRate = await db.exchangeRate.findFirst({
                    where: { currencyId: currency.id },
                    orderBy: { rateDate: 'desc' }
                })
                finalExchangeRate = lastRate?.rate || 1 // Bulamazsa 1 (Riskli ama MVP)
            }
        }

        // 3. Toplam Tutar Hesaplama (KDV ve İskonto Dahil)
        let totalAmount = 0
        const finalDiscountRate = discountRate ? parseFloat(discountRate) : 0

        const invoiceItemsData = items.map((item: any) => {
            const quantity = parseFloat(item.quantity)
            const unitPrice = parseFloat(item.unitPrice)
            const vatRate = parseInt(item.vatRate) || 0

            const baseAmount = quantity * unitPrice
            const discountAmount = baseAmount * (finalDiscountRate / 100)
            const discountedBase = baseAmount - discountAmount
            const vatAmount = discountedBase * (vatRate / 100)

            // Satır Toplamı (İskonto düşülmüş + KDV eklenmiş)
            const lineTotal = discountedBase + vatAmount

            totalAmount += lineTotal

            return {
                stockCode: item.stockCode,
                productName: item.productName,
                quantity: quantity,
                unitPrice: unitPrice,
                vatRate: vatRate,
                lineTotal: lineTotal
            }
        })

        // 4. TRANSACTION: Fatura ve Cari Hareketi Atomik Olarak Kaydet
        const result = await db.$transaction(async (tx) => {
            // A. Faturayı Kaydet
            const invoice = await tx.invoice.create({
                data: {
                    supplierId: supplier.id,
                    invoiceDate: new Date(invoiceDate),
                    currencyId: currency.id,
                    exchangeRate: finalExchangeRate,
                    totalAmount: totalAmount,
                    discountRate: finalDiscountRate,
                    items: {
                        create: invoiceItemsData
                    }
                },
                include: { items: true }
            })

            // B. Cari Hareketi (CashTransaction) Oluştur
            // Alış Faturası -> Tedarikçiye Borçlanıyoruz (Aslında Tedarikçi ALACAKLANIR)
            // Muhasebe Mantığı: Tedarikçi Hesabı ALACAK (Credit) çalışır.

            await tx.cashTransaction.create({
                data: {
                    cariId: supplier.id,
                    transactionType: TransactionType.CREDIT, // Tedarikçi Alacak
                    source: 'invoice',
                    sourceId: invoice.id,
                    amount: totalAmount,
                    currencyId: currency.id,
                    exchangeRate: finalExchangeRate,
                    transactionDate: new Date(invoiceDate)
                }
            })

            return invoice
        })

        return NextResponse.json(result, { status: 201 })

    } catch (error) {
        console.error('Fatura oluşturma hatası:', error)
        return NextResponse.json({ error: 'Fatura oluşturulurken bir hata oluştu.' }, { status: 500 })
    }
}
