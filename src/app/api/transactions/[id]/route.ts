import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

// GET /api/transactions/[id]
export async function GET(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params
        const transaction = await db.cashTransaction.findUnique({
            where: { id: parseInt(id) },
            include: {
                cari: true,
                currency: true
            }
        })

        if (!transaction) {
            return NextResponse.json({ error: 'İşlem bulunamadı.' }, { status: 404 })
        }

        return NextResponse.json(transaction)
    } catch (error) {
        console.error('Transaction fetch error:', error)
        return NextResponse.json({ error: 'İşlem bilgisi alınırken hata oluştu.' }, { status: 500 })
    }
}

// PUT /api/transactions/[id]
export async function PUT(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params
        const transactionId = parseInt(id)
        const body = await request.json()

        const existing = await db.cashTransaction.findUnique({
            where: { id: transactionId }
        })

        if (!existing) {
            return NextResponse.json({ error: 'İşlem bulunamadı.' }, { status: 404 })
        }

        const updateData: any = {}

        if (body.amount !== undefined) updateData.amount = body.amount
        if (body.description !== undefined) updateData.description = body.description
        if (body.transactionDate !== undefined) updateData.transactionDate = new Date(body.transactionDate)

        const updated = await db.cashTransaction.update({
            where: { id: transactionId },
            data: updateData,
            include: { cari: true, currency: true }
        })

        return NextResponse.json(updated)
    } catch (error) {
        console.error('Transaction update error:', error)
        return NextResponse.json({ error: 'İşlem güncellenirken hata oluştu.' }, { status: 500 })
    }
}

// DELETE /api/transactions/[id]
export async function DELETE(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params
        const transactionId = parseInt(id)

        const existing = await db.cashTransaction.findUnique({
            where: { id: transactionId }
        })

        if (!existing) {
            return NextResponse.json({ error: 'İşlem bulunamadı.' }, { status: 404 })
        }

        await db.cashTransaction.delete({
            where: { id: transactionId }
        })

        return NextResponse.json({ success: true, message: 'İşlem silindi.' })
    } catch (error) {
        console.error('Transaction delete error:', error)
        return NextResponse.json({ error: 'İşlem silinirken hata oluştu.' }, { status: 500 })
    }
}
