
import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

// GET /api/reports/dashboard
// Dashboard ve Özet Raporlar için veri döner
export async function GET(request: Request) {
    try {
        // Kurları çek
        const currencies = await db.currency.findMany()
        const currencyMap = currencies.reduce((acc: any, cur) => {
            acc[cur.id] = cur.code
            return acc
        }, {})

        // 1. Tüm işlemlerin bakiyelerini Cari bazında grupla
        const cariBalances = await db.cashTransaction.groupBy({
            by: ['cariId', 'transactionType', 'currencyId'],
            _sum: { amount: true }
        })

        // 2. Her Carinin her döviz cinsi için Net Bakiyesini hesapla
        // CariId -> { TL: 500, USD: -100 }
        const cariNetBalances: Record<string, Record<string, number>> = {}

        for (const cb of cariBalances) {
            const cariId = cb.cariId
            const code = currencyMap[cb.currencyId] || 'UNKNOWN'
            const amount = cb._sum.amount ? cb._sum.amount.toNumber() : 0

            if (!cariNetBalances[cariId]) {
                cariNetBalances[cariId] = {}
            }
            if (!cariNetBalances[cariId][code]) {
                cariNetBalances[cariId][code] = 0
            }

            // DEBIT = Cari Borçlandı (Bizim Alacağımız Artar) -> +
            // CREDIT = Cari Alacaklandı (Bizim Borcumuz Artar) -> -
            if (cb.transactionType === 'DEBIT') {
                cariNetBalances[cariId][code] += amount
            } else {
                cariNetBalances[cariId][code] -= amount
            }
        }

        // 3. Genel Dashboard Özeti Oluştur (Current Receivables / Payables)
        // Pozitif Bakiyeler toplami -> Toplam Alacak (Current Receivables)
        // Negatif Bakiyeler toplami -> Toplam Borç (Current Payables)

        const summaryByCurrency: any = {}

        Object.values(cariNetBalances).forEach(currencies => {
            Object.entries(currencies).forEach(([code, balance]) => {
                if (!summaryByCurrency[code]) {
                    summaryByCurrency[code] = { totalDebit: 0, totalCredit: 0, balance: 0 }
                }

                // Balance pozitifse -> Bizim alacağımız var
                if (balance > 0) {
                    summaryByCurrency[code].totalDebit += balance
                }
                // Balance negatifse -> Bizim borcumuz var
                else if (balance < 0) {
                    summaryByCurrency[code].totalCredit += Math.abs(balance)
                }

                // Net Nakit Pozisyonu (Alacak - Borç)
                summaryByCurrency[code].balance += balance
            })
        })

        // 4. En Borçlu Müşteriler ve Alacaklı Tedarikçiler Listesi Hazırla
        // Cari detaylarını çekmemiz lazım
        const cariIds = Object.keys(cariNetBalances).map(id => parseInt(id))

        let caries: any[] = []
        if (cariIds.length > 0) {
            caries = await db.cari.findMany({
                where: { id: { in: cariIds } },
                select: { id: true, title: true, type: true }
            })
        }

        const detailedBalances = caries.map(c => ({
            ...c,
            balances: cariNetBalances[c.id.toString()] || {}
        }))

        // Sıralama
        const topDebtors = detailedBalances
            .filter(c => (c.balances['TL'] || 0) > 0 && c.type === 'CUSTOMER')
            .sort((a, b) => (b.balances['TL'] || 0) - (a.balances['TL'] || 0))
            .slice(0, 5)

        const topCreditors = detailedBalances
            .filter(c => (c.balances['TL'] || 0) < 0 && c.type === 'SUPPLIER')
            .sort((a, b) => (a.balances['TL'] || 0) - (b.balances['TL'] || 0)) // En küçük (en borçlu olduğumuz)
            .slice(0, 5)
            .map(c => ({
                ...c,
                balances: {
                    ...c.balances,
                    TL: Math.abs(c.balances['TL'] || 0) // UI'da pozitif göstermek için
                }
            }))


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
