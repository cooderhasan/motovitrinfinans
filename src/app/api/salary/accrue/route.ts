import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { CurrencyCode } from '@prisma/client'

// POST /api/salary/accrue
// Ay sonu maaş tahakkuku - Tüm personellere maaş borcu yazar
export async function POST(request: Request) {
    try {
        const body = await request.json()
        const { month, year, cariId } = body  // Format: month=12, year=2024, cariId?=(optional)

        if (!month || !year) {
            return NextResponse.json({
                error: 'Ay ve yıl bilgisi zorunludur. Örnek: { month: 12, year: 2024 }'
            }, { status: 400 })
        }

        // Tüm aktif personelleri çek (maaşı olanlar)
        // Eğer cariId varsa sadece o personeli çek
        const whereClause: any = {
            type: 'EMPLOYEE',
            isActive: true,
            salary: { not: null }
        }

        if (cariId) {
            whereClause.id = parseInt(cariId)
        }

        const employees = await db.cari.findMany({
            where: whereClause,
            include: {
                defaultCurrency: true
            }
        })

        if (employees.length === 0) {
            return NextResponse.json({
                error: 'Maaş tanımlı aktif personel bulunamadı.'
            }, { status: 400 })
        }

        // TL currency'yi bul
        const tlCurrency = await db.currency.findUnique({
            where: { code: 'TL' as CurrencyCode }
        })

        if (!tlCurrency) {
            return NextResponse.json({ error: 'TL para birimi bulunamadı.' }, { status: 500 })
        }

        const accrualDate = new Date(year, month - 1, 28) // Ayın 28'i
        const results: any[] = []

        for (const employee of employees) {
            if (!employee.salary) continue

            const salaryAmount = employee.salary.toNumber()

            // Bu ay için daha önce maaş tahakkuku yapılmış mı kontrol et
            const existingAccrual = await db.cashTransaction.findFirst({
                where: {
                    cariId: employee.id,
                    source: 'salary_accrual',
                    transactionDate: {
                        gte: new Date(year, month - 1, 1),
                        lt: new Date(year, month, 1)
                    }
                }
            })

            if (existingAccrual) {
                results.push({
                    employee: employee.title,
                    status: 'skipped',
                    message: 'Bu ay için maaş tahakkuku zaten yapılmış'
                })
                continue
            }

            // Bu ay içindeki avansları hesapla (DEBIT işlemler = personele yapılan ödemeler)
            const advances = await db.cashTransaction.findMany({
                where: {
                    cariId: employee.id,
                    transactionType: 'DEBIT',
                    transactionDate: {
                        gte: new Date(year, month - 1, 1),
                        lt: new Date(year, month, 1)
                    }
                }
            })

            const totalAdvances = advances.reduce((sum, adv) => sum + adv.amount.toNumber(), 0)

            // Maaş tahakkuku işlemi oluştur (CREDIT = Şirket personele borçlanır = Maaş hak edişi)
            // Personele ödeme yapıldığında DEBIT, maaş hak edişi CREDIT olarak kaydedilir
            // Bakiye = DEBIT - CREDIT, negatif bakiye = şirket personele borçlu
            await db.cashTransaction.create({
                data: {
                    cariId: employee.id,
                    transactionType: 'CREDIT',
                    source: 'salary_accrual',
                    sourceId: employee.id,
                    amount: salaryAmount,
                    currencyId: employee.defaultCurrencyId || tlCurrency.id,
                    exchangeRate: 1,
                    description: `${month}/${year} Maaş Tahakkuku`,
                    transactionDate: accrualDate
                }
            })

            results.push({
                employee: employee.title,
                status: 'success',
                salary: salaryAmount,
                advances: totalAdvances,
                netPayable: salaryAmount - totalAdvances
            })
        }

        return NextResponse.json({
            success: true,
            message: `${results.filter(r => r.status === 'success').length} personel için maaş tahakkuku yapıldı.`,
            details: results
        })

    } catch (error) {
        console.error('Salary accrual error:', error)
        return NextResponse.json({
            error: 'Maaş tahakkuku yapılırken hata oluştu.'
        }, { status: 500 })
    }
}
