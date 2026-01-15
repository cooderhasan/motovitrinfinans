
import { db } from './src/lib/db'

async function checkCariTransactions() {
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
            orderBy: { transactionDate: 'asc' }
        })

        console.log('--- TRANSACTIONS ---')
        let balance = 0
        transactions.forEach(t => {
            const amount = t.amount.toNumber()
            const isDebit = t.transactionType === 'DEBIT'
            if (isDebit) balance += amount
            else balance -= amount

            console.log(`[${t.transactionDate.toISOString().split('T')[0]}] ${t.transactionType} ${amount} ${t.currency.code} | Rate: ${t.exchangeRate} | Desc: ${t.description} | Running Balance: ${balance}`)
        })

        console.log('--- TOTALS BY CURRENCY ---')
        const byCurrency: any = {}
        transactions.forEach(t => {
            const code = t.currency.code
            if (!byCurrency[code]) byCurrency[code] = 0

            if (t.transactionType === 'DEBIT') byCurrency[code] += t.amount.toNumber()
            else byCurrency[code] -= t.amount.toNumber()
        })
        console.log(byCurrency)

    } catch (error) {
        console.error('Error:', error)
    }
}

checkCariTransactions()
