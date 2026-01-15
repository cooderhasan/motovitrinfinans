
import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET() {
    try {
        const cari = await db.cari.findFirst({
            where: { title: { contains: 'Ali Bay' } },
            include: { defaultCurrency: true }
        })

        if (!cari) return NextResponse.json({ error: 'Ali Bay not found' })

        const transactions = await db.cashTransaction.findMany({
            where: { cariId: cari.id },
            include: { currency: true },
            orderBy: { transactionDate: 'desc' }
        })

        return NextResponse.json({ cari, transactions })
    } catch (error: any) {
        return NextResponse.json({ error: error.message })
    }
}
