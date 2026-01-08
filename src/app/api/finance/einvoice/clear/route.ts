
import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

// GET /api/finance/einvoice/clear
export async function GET(request: Request) {
    try {
        // 1. Find Synced Invoices (Those with UUID)
        const syncedInvoices = await db.invoice.findMany({
            where: { uuid: { not: null } },
            select: { id: true }
        })

        if (syncedInvoices.length === 0) {
            return NextResponse.json({ message: '⚠️ Silinecek senkronize fatura bulunamadı.' })
        }

        const syncedInvoiceIds = syncedInvoices.map(i => i.id)

        // 2. Delete Items of Synced Invoices
        const deletedItems = await db.invoiceItem.deleteMany({
            where: { invoiceId: { in: syncedInvoiceIds } }
        })

        // 3. Delete Synced Invoices
        const deletedInvoices = await db.invoice.deleteMany({
            where: { uuid: { not: null } }
        })

        return NextResponse.json({
            success: true,
            message: 'Temizlik tamamlandı.',
            details: {
                deletedInvoices: deletedInvoices.count,
                deletedItems: deletedItems.count
            }
        })

    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
