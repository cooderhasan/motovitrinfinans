
import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

// POST /api/reports/statement
// Cari Ekstre Raporu
export async function POST(request: Request) {
    try {
        const body = await request.json()
        const { cariId, currencyCode, startDate, endDate } = body

        console.log('--- STATEMENT REPORT DEBUG ---')
        console.log('Request:', { cariId, currencyCode, startDate, endDate })

        if (!cariId) {
            return NextResponse.json({ error: 'Cari seçimi zorunludur.' }, { status: 400 })
        }

        const cari = await db.cari.findUnique({
            where: { id: parseInt(cariId) }
        })
        if (!cari) return NextResponse.json({ error: 'Cari bulunamadı' }, { status: 404 })

        // 1. İlgili para birimindeki o carinin tüm hareketlerini çek
        // Tarih filtresi varsa uygula
        const whereClause: any = {
            cariId: parseInt(cariId)
        }

        if (currencyCode && currencyCode !== 'ALL') {
            whereClause.currency = {
                code: currencyCode
            }
        }

        if (startDate && endDate) {
            // End Date'i günün sonuna çekelim (23:59:59.999)
            const endDateTime = new Date(endDate)
            endDateTime.setHours(23, 59, 59, 999)

            whereClause.transactionDate = {
                gte: new Date(startDate),
                lte: endDateTime
            }
        }

        const transactions = await db.cashTransaction.findMany({
            where: whereClause,
            orderBy: { transactionDate: 'asc' }, // Tarihe göre artan
            include: {
                currency: true
            }
        })
        console.log(`Transactions Found: ${transactions.length}`)
        console.log('First 3:', transactions.slice(0, 3).map(t => `${t.transactionDate} - ${t.amount} ${t.currency.code}`))


        // 2. Yürüyen Bakiye (Running Balance) Hesaplama
        let openingBalance = 0
        let currency = null

        if (currencyCode && currencyCode !== 'ALL') {
            currency = await db.currency.findUnique({ where: { code: currencyCode } })
            if (cari.openingBalanceCurrencyId === currency?.id) {
                openingBalance = Number(cari.openingBalance)
            }
        } else {
            // ALL modunda açılış bakiyesini göster
            openingBalance = Number(cari.openingBalance)
        }

        let devirBalance = 0
        let runningBalance = 0 // Initialize explicitly


        // Eğer start date varsa, öncesini topla
        if (startDate) {
            const prevTransactions = await db.cashTransaction.groupBy({
                by: ['transactionType'],
                where: {
                    cariId: parseInt(cariId),
                    currency: { code: currencyCode },
                    transactionDate: { lt: new Date(startDate) }
                },
                _sum: { amount: true }
            })

            prevTransactions.forEach(t => {
                const amt = t._sum.amount ? t._sum.amount.toNumber() : 0
                if (t.transactionType === 'DEBIT') devirBalance += amt
                else devirBalance -= amt
            })
        }

        runningBalance = devirBalance

        const statementInitial = startDate ? [{
            id: 0,
            transactionDate: startDate,
            source: 'DEVIR',
            description: 'Donem Basi Devir',
            debit: devirBalance > 0 ? devirBalance : 0,
            credit: devirBalance < 0 ? Math.abs(devirBalance) : 0,
            balance: devirBalance
        }] : []


        const statementLines = transactions.map(t => {
            const amount = t.amount.toNumber()
            let debit = 0
            let credit = 0

            if (t.transactionType === 'DEBIT') {
                debit = amount
                runningBalance += amount
            } else {
                credit = amount
                runningBalance -= amount
            }

            return {
                id: t.id,
                transactionId: t.id,
                sourceId: t.sourceId, // Needed for edit/delete
                transactionDate: t.transactionDate,
                source: t.source,
                description: (t as any).description || getDescription(t),
                debit,
                credit,
                balance: runningBalance
            }
        })

        return NextResponse.json({
            cariId,
            currencyCode,
            statement: [...statementInitial, ...statementLines]
        })

    } catch (error) {
        console.error('Ekstre hatası:', error)
        return NextResponse.json({ error: 'Rapor oluşturulamadı.' }, { status: 500 })
    }
}

function getDescription(t: any) {
    if (t.source === 'invoice') return `Alis Faturasi #${t.sourceId}`
    if (t.source === 'sales_slip') return `Satis Fisi #${t.sourceId}`
    if (t.source === 'payment') return `Tahsilat/Odeme #${t.sourceId}`
    if (t.source === 'opening_balance') return 'Acilis Bakiyesi'
    return 'Diger Islem'
}
