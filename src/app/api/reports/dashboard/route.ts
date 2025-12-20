
import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { TransactionType } from '@prisma/client'

// GET /api/reports/dashboard
// Dashboard ve Özet Raporlar için veri döner
export async function GET(request: Request) {
    try {
        // 1. Genel Bakiye Durumu (Tüm Cariler)
        // Borçlar (Alacaklarımız) ve Alacaklar (Borçlarımız)
        const transactions = await db.cashTransaction.groupBy({
            by: ['transactionType', 'currencyId'],
            _sum: {
                amount: true
            }
        })

        // Bakiyeleri Currency bazında topla
        // DEBIT (Borç) -> Pozitif (Bizim alacağımız, Müşterinin borcu) veya Bizim kasaya giren?
        // Müşteri Satış -> Customer DEBIT. (Müşteri Borçlandı). Bizim Alacağımız var.
        // Tedarikçi Alış -> Supplier CREDIT. (Tedarikçi Alacaklandı). Bizim Borcumuz var.

        // Toplam Alacak (Receivables) -> SUM(DEBIT) of Customers
        // Toplam Borç (Payables) -> SUM(CREDIT) of Suppliers

        // Ancak sistemde mixed transactionlar olabilir. En doğrusu:
        // Net Bakiye = SUM(DEBIT) - SUM(CREDIT)
        // Eğer > 0 ise "Borçlu" (Bize borcu var / Alacaklıyız)
        // Eğer < 0 ise "Alacaklı" (Bizim borcumuz var)

        const summaryByCurrency: any = {}

        // Kurları çek (isimleri için)
        const currencies = await db.currency.findMany()
        const currencyMap = currencies.reduce((acc: any, cur) => {
            acc[cur.id] = cur.code
            return acc
        }, {})

        // Hesaplama
        transactions.forEach(t => {
            const code = currencyMap[t.currencyId] || 'UNKNOWN'
            if (!summaryByCurrency[code]) {
                summaryByCurrency[code] = { totalDebit: 0, totalCredit: 0, balance: 0 }
            }

            const amount = t._sum.amount ? t._sum.amount.toNumber() : 0

            if (t.transactionType === 'DEBIT') {
                summaryByCurrency[code].totalDebit += amount
                summaryByCurrency[code].balance += amount
            } else {
                summaryByCurrency[code].totalCredit += amount
                summaryByCurrency[code].balance -= amount
            }
        })

        // 2. En Borçlu Müşteriler (Top 5 Receivables)
        // Karmaşık sorgu, şimdilik basit bir listeleme yapalım.
        // SQL aggregate daha performanslı olur ama Prisma `groupBy` ile `cariId` bazında alabiliriz.

        const cariBalances = await db.cashTransaction.groupBy({
            by: ['cariId', 'transactionType', 'currencyId'],
            _sum: { amount: true }
        })

        // Bellekte işle (Büyük veri setleri için raw SQL yazılmalı, şimdilik MVP)
        const cariMap: any = {}

        for (const cb of cariBalances) {
            if (!cariMap[cb.cariId]) {
                // Cari detayını çekmek pahalı olabilir, transaction bitince id listesiyle çekelim
                cariMap[cb.cariId] = { TL: 0, USD: 0 }
            }

            const code = currencyMap[cb.currencyId]
            const amount = cb._sum.amount ? cb._sum.amount.toNumber() : 0

            if (code) {
                if (cb.transactionType === 'DEBIT') {
                    cariMap[cb.cariId][code] += amount
                } else {
                    cariMap[cb.cariId][code] -= amount
                }
            }
        }

        // Carileri getir
        const cariIds = Object.keys(cariMap).map(id => parseInt(id))
        const caries = await db.cari.findMany({
            where: { id: { in: cariIds } },
            select: { id: true, title: true, type: true }
        })

        // Sonuçları birleştir
        const detailedBalances = caries.map(c => ({
            ...c,
            balances: cariMap[c.id]
        }))

        // Sıralama: En yüksek TL bakiyesi olanlar (Örnek)
        const topDebtors = detailedBalances
            .filter(c => c.balances.TL > 0)
            .sort((a, b) => b.balances.TL - a.balances.TL)
            .slice(0, 5)

        const topCreditors = detailedBalances
            .filter(c => c.balances.TL < 0)
            .sort((a, b) => a.balances.TL - b.balances.TL) // En küçük (negatif) en başa
            .slice(0, 5)


        return NextResponse.json({
            summary: summaryByCurrency,
            topDebtors,
            topCreditors
        })

    } catch (error) {
        console.error('Raporlama hatası:', error)
        return NextResponse.json({ error: 'Rapor oluşturulurken bir hata oluştu.' }, { status: 500 })
    }
}
