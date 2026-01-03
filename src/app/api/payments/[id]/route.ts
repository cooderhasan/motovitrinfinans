
import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { CurrencyCode, TransactionType, PaymentType } from '@prisma/client'

// /api/payments/[id]
export async function DELETE(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params
        const paymentId = parseInt(id)

        if (isNaN(paymentId)) {
            return NextResponse.json({ error: 'Geçersiz ID' }, { status: 400 })
        }

        // Transaction ile hem payment'ı hem de linked cashTransaction'ı silelim
        await db.$transaction(async (tx) => {
            // 1. Önce cari hareketini sil (Foreign Key kısıtlaması yoksa sıra fark etmez ama mantıken child-parent ilişkisine dikkat)
            // Bizde CashTransaction sourceId ile bağlı, soft relation gibi string tutuyoruz ama yine de önce transaction'ı silebiliriz.
            // Strict relation yoksa rahatız.

            await tx.cashTransaction.deleteMany({
                where: {
                    source: 'payment',
                    sourceId: paymentId
                }
            })

            // 2. Ödemeyi sil
            await tx.payment.delete({
                where: { id: paymentId }
            })
        })

        return NextResponse.json({ success: true })
    } catch (error: any) {
        console.error('Ödeme silme hatası:', error)
        return NextResponse.json({ error: 'Silme işlemi başarısız: ' + error.message }, { status: 500 })
    }
}

export async function PUT(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params
        const paymentId = parseInt(id)
        const body = await request.json()
        const { amount, description, paymentDate } = body

        if (isNaN(paymentId)) {
            return NextResponse.json({ error: 'Geçersiz ID' }, { status: 400 })
        }

        // Validasyon
        if (!amount || amount <= 0) {
            return NextResponse.json({ error: 'Geçersiz tutar' }, { status: 400 })
        }

        const updatedPayment = await db.$transaction(async (tx) => {
            // 1. Payment güncelle
            const payment = await tx.payment.update({
                where: { id: paymentId },
                data: {
                    amount: amount,
                    description: description,
                    paymentDate: new Date(paymentDate)
                }
            })

            // 2. CashTransaction güncelle
            // source='payment' ve sourceId=paymentId olanı bulup güncellememiz lazım
            await tx.cashTransaction.updateMany({
                where: {
                    source: 'payment',
                    sourceId: paymentId
                },
                data: {
                    amount: amount,
                    description: description,
                    transactionDate: new Date(paymentDate)
                }
            })

            return payment
        })

        return NextResponse.json(updatedPayment)
    } catch (error: any) {
        console.error('Ödeme güncelleme hatası:', error)
        return NextResponse.json({ error: 'Güncelleme işlemi başarısız: ' + error.message }, { status: 500 })
    }
}
