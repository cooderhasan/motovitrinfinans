import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

// NES API Response Interface
interface NesInvoice {
    uuid: string
    invoiceNumber: string
    issueDate: string
    payableAmount: number
    currencyCode: string
    sender: {
        vknTckn: string
        title: string
    }
}

export async function POST() {
    try {
        // 1. Get Settings
        const settings = await db.settings.findMany({
            where: {
                key: { in: ['nesApiKey', 'nesApiUrl'] }
            }
        })

        const settingsMap = settings.reduce((acc, curr) => {
            acc[curr.key] = curr.value || ''
            return acc
        }, {} as Record<string, string>)

        const apiKey = settingsMap['nesApiKey']
        const apiUrl = settingsMap['nesApiUrl'] || 'https://api.nes.com.tr/'

        if (!apiKey) {
            return NextResponse.json({ error: 'NES API Anahtarı bulunamadı. Lütfen ayarlardan giriniz.' }, { status: 400 })
        }

        // 2. Fetch Invoices from NES (Using incoming/invoices endpoint as discovered)
        // Adjust endpoint based on doc discovery: /v1/incoming/invoices
        const response = await fetch(`${apiUrl}einvoice/v1/incoming/invoices?pageSize=100`, {
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json'
            }
        })

        if (!response.ok) {
            const errorText = await response.text()
            console.error('NES API Error:', errorText)
            return NextResponse.json({ error: `NES API Hatası: ${response.status}`, details: errorText }, { status: response.status })
        }

        const data = await response.json()
        const invoices: any[] = data.data || [] // Adjust based on actual response structure

        let processedCount = 0
        let createdCount = 0

        // 3. Process Invoices
        for (const inv of invoices) {
            processedCount++

            // Check if exists
            const existing = await db.invoice.findFirst({
                where: { uuid: inv.uuid }
            })

            if (existing) continue

            // Find or Create Supplier (Cari)
            let supplier = await db.cari.findFirst({
                where: {
                    taxNumber: inv.sender.vknTckn,
                    type: 'SUPPLIER'
                }
            })

            if (!supplier) {
                // Get default currency (TL)
                const currency = await db.currency.findFirst({ where: { code: 'TL' } })
                if (!currency) throw new Error('TL Para birimi bulunamadı')

                supplier = await db.cari.create({
                    data: {
                        type: 'SUPPLIER',
                        title: inv.sender.title || 'Bilinmeyen Tedarikçi',
                        taxNumber: inv.sender.vknTckn,
                        defaultCurrencyId: currency.id,
                        openingBalanceCurrencyId: currency.id,
                        isActive: true
                    }
                })
            }

            // Get Currency (Assume TL for now or map from inv.currencyCode)
            // NES returns "TRY" usually, our DB uses "TL" enum.
            const currencyCode = (inv.currencyCode === 'TRY' ? 'TL' : inv.currencyCode) || 'TL'

            let currency = await db.currency.findFirst({
                where: { code: currencyCode as any }
            })

            // Fallback to TL if not found
            if (!currency) {
                currency = await db.currency.findFirst({ where: { code: 'TL' } })
            }

            if (!currency) throw new Error('Para birimi bulunamadı')

            // Create Invoice
            await db.invoice.create({
                data: {
                    uuid: inv.uuid,
                    invoiceNumber: inv.invoiceNumber,
                    invoiceDate: new Date(inv.issueDate),
                    supplierId: supplier.id,
                    currencyId: currency.id,
                    exchangeRate: 1, // Default for TL, logic needed for others
                    totalAmount: inv.payableAmount,
                    // We don't have line items yet, so we just set total
                }
            })
            createdCount++
        }

        return NextResponse.json({
            success: true,
            message: `${processedCount} fatura incelendi, ${createdCount} yeni fatura eklendi.`,
            processed: processedCount,
            created: createdCount
        })

    } catch (error) {
        console.error('Sync error:', error)
        const errorMessage = error instanceof Error ? error.message : 'Bilinmeyen hata'
        return NextResponse.json({ error: 'Senkronizasyon hatası', details: errorMessage }, { status: 500 })
    }
}
