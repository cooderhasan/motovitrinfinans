import { PrismaClient, CurrencyCode, CariType } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
    console.log('Seeding database...')

    // 1. Currencies
    const tl = await prisma.currency.upsert({
        where: { code: CurrencyCode.TL },
        update: {},
        create: {
            code: CurrencyCode.TL,
            name: 'Türk Lirası',
        },
    })

    const usd = await prisma.currency.upsert({
        where: { code: CurrencyCode.USD },
        update: {},
        create: {
            code: CurrencyCode.USD,
            name: 'US Dollar',
        },
    })

    console.log('Currencies created.')

    // 2. Exchange Rates (Initial)
    await prisma.exchangeRate.create({
        data: {
            currencyId: usd.id,
            rate: 35.50, // Example rate
        },
    })

    console.log('Exchange Rate (USD) created.')

    // 3. Caries - Skip if already exists
    const existingCaries = await prisma.cari.count()

    if (existingCaries === 0) {
        // Customer
        const customer = await prisma.cari.create({
            data: {
                type: CariType.CUSTOMER,
                title: 'Örnek Müşteri A.Ş.',
                defaultCurrencyId: tl.id,
                openingBalance: 0,
                openingBalanceCurrencyId: tl.id,
                isActive: true,
            },
        })

        // Supplier
        const supplier = await prisma.cari.create({
            data: {
                type: CariType.SUPPLIER,
                title: 'Global Tedarik Ltd.',
                defaultCurrencyId: usd.id, // USD Supplier
                openingBalance: 0,
                openingBalanceCurrencyId: usd.id,
                isActive: true,
            },
        })

        // Employee
        const employee = await prisma.cari.create({
            data: {
                type: CariType.EMPLOYEE,
                title: 'Ahmet Yılmaz',
                defaultCurrencyId: tl.id,
                openingBalance: 0,
                openingBalanceCurrencyId: tl.id,
                isActive: true,
            },
        })

        console.log({ customer, supplier, employee })
    } else {
        console.log('Caries already exist, skipping seed...')
    }

    // 4. Default Settings - Sadece yoksa ekle, varsa dokunma
    console.log('Checking settings...')
    const defaultSettings = [
        { key: 'siteTitle', value: 'Finans ERP' },
        { key: 'siteDescription', value: 'Finansal Yonetim Sistemi' },
        { key: 'faviconUrl', value: '/favicon.ico' },
        { key: 'logoUrl', value: '' }
    ]

    for (const setting of defaultSettings) {
        await prisma.settings.upsert({
            where: { key: setting.key },
            update: {}, // Varsa güncelleme YAPMA - mevcut değeri koru
            create: {
                key: setting.key,
                value: setting.value
            }
        })
    }
    console.log('Settings checked/initialized.')

    console.log('Seeding finished.')
}

main()
    .then(async () => {
        await prisma.$disconnect()
    })
    .catch(async (e) => {
        console.error(e)
        await prisma.$disconnect()
        process.exit(1)
    })
