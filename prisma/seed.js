"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
async function main() {
    console.log('Seeding database...');
    // 1. Currencies
    const tl = await prisma.currency.upsert({
        where: { code: 'TL' },
        update: {},
        create: {
            code: 'TL',
            name: 'Türk Lirası',
        },
    });
    const usd = await prisma.currency.upsert({
        where: { code: 'USD' },
        update: {},
        create: {
            code: 'USD',
            name: 'US Dollar',
        },
    });
    console.log('Currencies created.');
    // 2. Exchange Rates (Initial) - Check if exists first
    const existingRate = await prisma.exchangeRate.findFirst({
        where: { currencyId: usd.id }
    });
    if (!existingRate) {
        await prisma.exchangeRate.create({
            data: {
                currencyId: usd.id,
                rate: 35.50,
            },
        });
        console.log('Exchange Rate (USD) created.');
    } else {
        console.log('Exchange Rate already exists, skipping...');
    }
    // 3. Caries - Skip if already exists
    const existingCaries = await prisma.cari.count();
    if (existingCaries === 0) {
        // Customer
        const customer = await prisma.cari.create({
            data: {
                type: 'CUSTOMER',
                title: 'Örnek Müşteri A.Ş.',
                defaultCurrencyId: tl.id,
                openingBalance: 0,
                openingBalanceCurrencyId: tl.id,
                isActive: true,
            },
        });
        // Supplier
        const supplier = await prisma.cari.create({
            data: {
                type: 'SUPPLIER',
                title: 'Global Tedarik Ltd.',
                defaultCurrencyId: usd.id,
                openingBalance: 0,
                openingBalanceCurrencyId: usd.id,
                isActive: true,
            },
        });
        // Employee
        const employee = await prisma.cari.create({
            data: {
                type: 'EMPLOYEE',
                title: 'Ahmet Yılmaz',
                defaultCurrencyId: tl.id,
                openingBalance: 0,
                openingBalanceCurrencyId: tl.id,
                isActive: true,
            },
        });
        console.log({ customer, supplier, employee });
    } else {
        console.log('Caries already exist, skipping seed...');
    }
    console.log('Seeding finished.');
}
main()
    .then(async () => {
        await prisma.$disconnect();
    })
    .catch(async (e) => {
        console.error(e);
        await prisma.$disconnect();
        process.exit(1);
    });
