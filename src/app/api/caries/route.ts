
import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { CariType, CurrencyCode } from '@prisma/client'

// GET /api/caries
// Tüm carileri listeler (filtreleme eklenebilir)
export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url)
        const type = searchParams.get('type') // CUSTOMER, SUPPLIER, EMPLOYEE

        const whereClause: any = {}
        if (type && Object.values(CariType).includes(type as CariType)) {
            whereClause.type = type
        }

        const caries = await db.cari.findMany({
            where: whereClause,
            include: {
                defaultCurrency: true,
                // Bakiye hesaplama cashTransactions üzerinden yapılacağı için burada direkt bakiye alanı yok
                // Ancak açılış bakiyesi var.
            },
            orderBy: { createdAt: 'desc' }
        })

        return NextResponse.json(caries)
    } catch (error) {
        console.error('Cari listeleme hatası:', error)
        return NextResponse.json({ error: 'Cariler listelenirken bir hata oluştu.' }, { status: 500 })
    }
}

// POST /api/caries
// Yeni cari oluşturur
export async function POST(request: Request) {
    try {
        const body = await request.json()
        // Validation (Zod kullanılabilir ama şimdilik manuel)
        if (!body.title || !body.type || !body.defaultCurrencyCode) {
            return NextResponse.json({ error: 'Eksik bilgi: title, type, defaultCurrencyCode zorunludur.' }, { status: 400 })
        }

        // Currency ID bul
        const currency = await db.currency.findUnique({
            where: { code: body.defaultCurrencyCode as CurrencyCode }
        })

        if (!currency) {
            return NextResponse.json({ error: 'Geçersiz para birimi kodu.' }, { status: 400 })
        }

        const newCari = await db.cari.create({
            data: {
                title: body.title,
                type: body.type as CariType,
                defaultCurrencyId: currency.id,
                openingBalance: body.openingBalance || 0,
                openingBalanceCurrencyId: currency.id, // Varsayılan olarak aynı kabul ediyoruz şimdilik
                isActive: true
            }
        })

        // Eğer açılış bakiyesi > 0 ise, CashTransaction oluşturulmalı mı?
        // Kurallar gereği: "Cari = Hareket, Bakiye = Sonuç".
        // Açılış bakiyesi bir harekettir.
        if (newCari.openingBalance.toNumber() > 0) {
            await db.cashTransaction.create({
                data: {
                    cariId: newCari.id,
                    transactionType: body.type === 'SUPPLIER' ? 'CREDIT' : 'DEBIT', // Tedarikçi ise alacaklı başlar, Müşteri ise borçlu
                    source: 'opening_balance',
                    sourceId: newCari.id, // Kendisine referans
                    amount: newCari.openingBalance,
                    currencyId: currency.id,
                    exchangeRate: 1, // Kendi para biriminde olduğu için kur 1
                    transactionDate: new Date()
                }
            })
        }

        return NextResponse.json(newCari, { status: 201 })

    } catch (error) {
        console.error('Cari oluşturma hatası:', error)
        return NextResponse.json({ error: 'Cari oluşturulurken bir hata oluştu.' }, { status: 500 })
    }
}
