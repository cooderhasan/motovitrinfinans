
import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

// POST /api/reports/statement
// Cari Ekstre Raporu
export async function POST(request: Request) {
    try {
        const body = await request.json()
        const { cariId, startDate, endDate, currencyCode } = body

        if (!cariId || !currencyCode) {
            return NextResponse.json({ error: 'Cari ve Para Birimi seçimi zorunludur.' }, { status: 400 })
        }

        // 1. İlgili para birimindeki o carinin tüm hareketlerini çek
        // Tarih filtresi varsa uygula
        const whereClause: any = {
            cariId: parseInt(cariId),
            currency: {
                code: currencyCode
            }
        }

        if (startDate && endDate) {
            whereClause.transactionDate = {
                gte: new Date(startDate),
                lte: new Date(endDate)
            }
        }

        const transactions = await db.cashTransaction.findMany({
            where: whereClause,
            orderBy: { transactionDate: 'asc' }, // Tarihe göre artan
            include: {
                currency: true
            }
        })

        // 2. Yürüyen Bakiye (Running Balance) Hesaplama
        // Bu Cariye göre:
        // DEBIT (Borç) -> Pozitif (+)
        // CREDIT (Alacak) -> Negatif (-)

        // NOT: Eğer tarih aralığı verildiyse, o tarihten önceki devir bakiyesini de hesaplamak gerekir.
        // Şimdilik basitleştirilmiş versiyon: Sadece seçilen aralığı gösteriyoruz ama devir bakiyesi olmadığını varsayıyoruz (veya UI'da belirtiyoruz).
        // Gelişmiş versiyonda: startDate öncesi SUM alınır ve "Devir" satırı eklenir.

        let runningBalance = 0
        let devirBalance = 0

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
