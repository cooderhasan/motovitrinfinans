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

        const skippedUuids: string[] = []

        // 3. Process Invoices
        const debugRawInvoice = invoices.length > 0 ? invoices[0] : null

        for (const inv of invoices) {
            processedCount++

            // Debug: Fix for potential missing UUID
            // Some APIs return 'uuid', others 'ETTN', others 'id'
            const realUuid = inv.uuid || inv.ettn || inv.id || inv.envelopeId

            if (!realUuid) {
                console.warn('Invoice without UUID found:', inv)
                // Skip or handle error. If we insert null, we get duplicates.
                // Let's generate one if missing? No, that breaks sync.
                continue
            }

            // Check if exists
            const existing = await db.invoice.findFirst({
                where: { uuid: realUuid }
            })

            if (existing) {
                skippedUuids.push(realUuid)
                continue
            }

            // 2b. FETCH DETAILS (Crucial fix: List doesn't have lines or full sender)
            // We must fetch the individual invoice to get 'lines' and 'accountingSupplierParty'
            let detailedInv = inv
            try {
                const detailRes = await fetch(`${apiUrl}einvoice/v1/incoming/invoices/${realUuid}`, {
                    headers: { 'Authorization': `Bearer ${apiKey}` }
                })
                if (detailRes.ok) {
                    detailedInv = await detailRes.json()
                } else {
                    console.warn(`Could not fetch details for ${realUuid}, using summary.`)
                }
            } catch (e) {
                console.error(`Error fetching detail for ${realUuid}`, e)
            }

            // From now on, use detailedInv
            const invToUse = detailedInv

            // Safely get sender details
            // Try 'sender' first, then 'accountingSupplierParty' (UBL standard)
            let senderTitle = invToUse.sender?.title || invToUse.sender?.name
            let senderTax = invToUse.sender?.vknTckn || invToUse.sender?.identifier

            if (!senderTitle && invToUse.accountingSupplierParty) {
                const party = invToUse.accountingSupplierParty.party
                senderTitle = party?.partyName?.name || (party?.person ? (party.person.firstName + ' ' + party.person.familyName) : 'Bilinmeyen Tedarikçi')
                senderTax = party?.partyIdentification?.[0]?.value || '1111111111'
            }

            if (!senderTitle) senderTitle = 'Bilinmeyen Tedarikçi'
            if (!senderTax) senderTax = '1111111111'

            // Find or Create Supplier (Cari)
            let supplier = await db.cari.findFirst({
                where: {
                    taxNumber: senderTax,
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
                        title: senderTitle,
                        taxNumber: senderTax,
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
            const newInvoice = await db.invoice.create({
                data: {
                    uuid: realUuid,
                    invoiceNumber: invToUse.invoiceNumber,
                    invoiceDate: new Date(invToUse.issueDate),
                    supplierId: supplier.id,
                    currencyId: currency.id,
                    exchangeRate: 1, // Default for TL, logic needed for others
                    totalAmount: invToUse.payableAmount,
                }
            })

            // 4. Process Line Items
            // 4. Process Line Items
            // NES/UBL usually has 'invoiceLine' array. Some JSON converters might use 'lines'.
            const lineItems = invToUse.invoiceLine || invToUse.lines || []

            if (Array.isArray(lineItems)) {
                for (const item of lineItems) {
                    // Extract item details
                    // Note: Structure depends heavily on NES JSON format.
                    // Assuming common UBL-to-JSON mapping:
                    // item.item.name, item.invoicedQuantity.value, item.price.priceAmount.value

                    const productName = item.item?.name || item.name || 'Hizmet/Ürün'
                    const quantity = item.invoicedQuantity?.value || item.quantity || 1

                    // Price logic: usually priceAmount is Unit Price
                    const unitPrice = item.price?.priceAmount?.value || item.unitPrice || 0
                    const lineTotal = item.lineExtensionAmount?.value || item.total || (quantity * unitPrice)

                    // VAT logic: item.taxTotal?.taxSubtotal...
                    // Simplified: Try to find a percent or calculate?
                    // Let's default to 20 if missing for now, or 0.
                    const vatRate = 20

                    await db.invoiceItem.create({
                        data: {
                            invoiceId: newInvoice.id,
                            productName: productName,
                            quantity: quantity,
                            unitPrice: unitPrice,
                            vatRate: vatRate,
                            lineTotal: lineTotal
                        }
                    })
                }
            }
            createdCount++
        }

        const totalInDb = await db.invoice.count()

        return NextResponse.json({
            success: true,
            message: `${processedCount} fatura incelendi, ${createdCount} yeni fatura eklendi.`,
            processed: processedCount,
            created: createdCount,
            skipped: processedCount - createdCount,
            totalInDb: totalInDb,
            debugSkipped: skippedUuids
        })

    } catch (error) {
        console.error('Sync error:', error)
        const errorMessage = error instanceof Error ? error.message : 'Bilinmeyen hata'
        return NextResponse.json({ error: 'Senkronizasyon hatası', details: errorMessage }, { status: 500 })
    }
}
