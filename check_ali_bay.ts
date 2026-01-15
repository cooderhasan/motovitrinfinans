
import { db } from './src/lib/db'

async function checkTransactions() {
    try {
        // 1. Find Cari "Ali Bay"
        const cari = await db.cari.findFirst({
            where: { title: { contains: 'Ali Bay' } },
            include: { defaultCurrency: true }
        })

        if (!cari) {
            console.log('Cari "Ali Bay" not found.')
            return
        }

        console.log(`Cari found: ${cari.title} (ID: ${cari.id})`)
        console.log(`Default Currency: ${cari.defaultCurrency.code}`)

        // 2. Get all transactions
        const transactions = await db.cashTransaction.findMany({
            where: { cariId: cari.id },
            include: { currency: true },
            orderBy: { transactionDate: 'desc' }
        })

        console.log('--- TRANSACTIONS ---')
        transactions.forEach(t => {
            console.log(`[${t.transactionDate.toISOString().split('T')[0]}] ${t.transactionType} - Amount: ${t.amount} ${t.currency.code} - Desc: ${t.description || 'N/A'}`)
        })

        // 3. Summarize by Currency
        const summary: Record<string, number> = {}
        transactions.forEach(t => {
            const code = t.currency.code
            const amount = t.amount.toNumber()
            if (!summary[code]) summary[code] = 0

            if (t.transactionType === 'DEBIT') summary[code] += amount
            else summary[code] -= amount
        })

        console.log('--- BALANCE SUMMARY ---')
        console.log(summary)

    } catch (error) {
        console.error('Error:', error)
    }
}

checkTransactions()
