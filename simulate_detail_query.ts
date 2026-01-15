
import { db } from './src/lib/db'

async function simulate() {
    try {
        console.log('1. Fetching Ali Bay...')
        const cari = await db.cari.findFirst({
            where: { title: { contains: 'Ali Bay' } },
            include: { defaultCurrency: true }
        })

        if (!cari) {
            console.log('Cari not found')
            return
        }

        console.log('Cari:', cari.title, 'ID:', cari.id)
        console.log('Default Currency:', cari.defaultCurrency?.code)

        const targetCurrency = cari.defaultCurrency?.code || 'TL'
        console.log('Target Filter Code:', targetCurrency)

        console.log('2. Querying Transactions (Simulating Statement API)...')
        const whereClause = {
            cariId: cari.id,
            currency: {
                code: targetCurrency
            }
        }
        console.log('Where Clause:', JSON.stringify(whereClause, null, 2))

        const transactions = await db.cashTransaction.findMany({
            where: whereClause,
            orderBy: { transactionDate: 'asc' },
            include: { currency: true }
        })

        console.log(`Found ${transactions.length} transactions match the filter.`)
        transactions.forEach(t => {
            console.log(`- [${t.transactionDate.toISOString()}] ${t.amount} ${t.currency.code} (${t.description})`)
        })

        console.log('3. Checking for mismatched currency transactions...')
        const allTransactions = await db.cashTransaction.findMany({
            where: { cariId: cari.id },
            include: { currency: true }
        })

        const mismatched = allTransactions.filter(t => t.currency.code !== targetCurrency)
        if (mismatched.length > 0) {
            console.log(`WARNING: Found ${mismatched.length} transactions with different currency!`)
            mismatched.forEach(t => {
                console.log(`- [${t.transactionDate.toISOString()}] ${t.amount} ${t.currency.code} (${t.description})`)
            })
        } else {
            console.log('No mismatched currency transactions found.')
        }

    } catch (e) {
        console.error(e)
    }
}

simulate()
