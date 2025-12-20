
import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { CurrencyCode, TransactionType, PaymentType, CariType } from '@prisma/client'

// POST /api/payments
// Tahsilat veya Ödeme İşlemi
export async function POST(request: Request) {
    try {
        const body = await request.json()
        const {
            cariId,
            paymentType, // COLLECTION (Tahsilat) or PAYMENT (Ödeme)
            method,      // CASH, BANK, TRANSFER
            amount,
            currencyCode,
            exchangeRate,
            paymentDate
        } = body

        // 1. Validasyon
        if (!cariId || !paymentType || !amount || !currencyCode) {
            return NextResponse.json({ error: 'Eksik bilgi.' }, { status: 400 })
        }

        const cari = await db.cari.findUnique({ where: { id: cariId } })
        if (!cari) return NextResponse.json({ error: 'Cari bulunamadı.' }, { status: 400 })

        const currency = await db.currency.findUnique({ where: { code: currencyCode as CurrencyCode } })
        if (!currency) return NextResponse.json({ error: 'Para birimi geçersiz.' }, { status: 400 })

        // 2. Kur Yönetimi
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

        // 3. Transaction Type Belirleme
        // Muhasebe Mantığı:
        // Tahsilat (Collection) -> Cari ALACAKLANIR (Credit). Borcu düşer.
        // Ödeme (Payment) -> Cari BORÇLANIR (Debit). Alacağı düşer.

        let transactionType: TransactionType
        if (paymentType === 'COLLECTION') {
            transactionType = TransactionType.CREDIT
        } else {
            transactionType = TransactionType.DEBIT
        }

        // 4. TRANSACTION
        const result = await db.$transaction(async (tx) => {
            // A. Ödeme Kaydı
            const payment = await tx.payment.create({
                data: {
                    cariId: cari.id,
                    paymentType: paymentType as PaymentType,
                    method: method,
                    amount: amount,
                    currencyId: currency.id,
                    exchangeRate: finalExchangeRate,
                    paymentDate: new Date(paymentDate || new Date())
                }
            })

            // B. Cari Hareketi (CashTransaction)
            await tx.cashTransaction.create({
                data: {
                    cariId: cari.id,
                    transactionType: transactionType,
                    source: 'payment',
                    sourceId: payment.id,
                    amount: amount,
                    currencyId: currency.id,
                    exchangeRate: finalExchangeRate,
                    transactionDate: new Date(paymentDate || new Date())
                }
            })

            return payment
        })

        return NextResponse.json(result, { status: 201 })

    } catch (error) {
        console.error('Ödeme işlemi hatası:', error)
        return NextResponse.json({ error: 'İşlem sırasında bir hata oluştu.' }, { status: 500 })
    }
}
