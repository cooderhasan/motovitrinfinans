import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET() {
    try {
        const invoices = await db.invoice.findMany({
            take: 50,
            orderBy: { createdAt: 'desc' },
            include: {
                supplier: true,
                currency: true
            }
        })

        return NextResponse.json({
            count: invoices.length,
            invoices: invoices.map(inv => ({
                id: inv.id,
                uuid: inv.uuid,
                invoiceNumber: inv.invoiceNumber,
                supplier: inv.supplier?.title || 'Yok',
                amount: inv.totalAmount,
                date: inv.invoiceDate,
                created: inv.createdAt
            }))
        })
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
