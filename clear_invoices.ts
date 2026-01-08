
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
    console.log('🗑️  NES Faturaları (Senkronize edilenler) temizleniyor...')
    console.log('⚠️  Manuel eklenen faturalara DOKUNULMAYACAKTIR.')

    // 1. Find Synced Invoices (Those with UUID)
    const syncedInvoices = await prisma.invoice.findMany({
        where: { uuid: { not: null } },
        select: { id: true, invoiceNumber: true }
    })

    if (syncedInvoices.length === 0) {
        console.log('⚠️  Silinecek senkronize fatura bulunamadı.')
        return
    }

    const syncedInvoiceIds = syncedInvoices.map(i => i.id)

    // 2. Delete Items of Synced Invoices
    const deletedItems = await prisma.invoiceItem.deleteMany({
        where: { invoiceId: { in: syncedInvoiceIds } }
    })
    console.log(`✅ ${deletedItems.count} adet fatura kalemi silindi.`)

    // 3. Delete Synced Invoices
    const deletedInvoices = await prisma.invoice.deleteMany({
        where: { uuid: { not: null } }
    })
    console.log(`✅ ${deletedInvoices.count} adet senkronize fatura silindi.`)

    console.log('✨ Temizlik tamamlandı. Şimdi "NES Faturaları Çek" diyebilirsiniz.')
}

main()
    .catch(e => {
        console.error('❌ Hata:', e)
    })
    .finally(async () => {
        await prisma.$disconnect()
    })
