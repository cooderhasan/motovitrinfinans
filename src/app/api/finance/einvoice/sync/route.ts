import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { XMLParser } from 'fast-xml-parser'

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

            // 2b. FETCH DETAILS & UBL
            // Strategy: 
            // - Supplier Info: Trust the Summary (inv) first, as Detail often misses it.
            // - Lines: Trust JSON Detail first, if missing, fetch UBL XML.

            let detailedInv: any = null
            let ublLines: any[] = []

            // Try fetching JSON Detail
            try {
                const detailRes = await fetch(`${apiUrl}einvoice/v1/incoming/invoices/${realUuid}`, {
                    headers: { 'Authorization': `Bearer ${apiKey}` }
                })
                if (detailRes.ok) detailedInv = await detailRes.json()
            } catch (e) {
                console.error(`JSON Detail fetch failed for ${realUuid}`, e)
            }

            // Determine Sender Source
            const sourceForSender = (inv.accountingSupplierParty || inv.sender) ? inv : (detailedInv || inv)

            // Extract Sender
            let senderTitle = sourceForSender.sender?.title || sourceForSender.sender?.name
            let senderTax = sourceForSender.sender?.vknTckn || sourceForSender.sender?.identifier

            if (!senderTitle && sourceForSender.accountingSupplierParty) {
                const party = sourceForSender.accountingSupplierParty.party || sourceForSender.accountingSupplierParty
                senderTitle = party?.partyName?.name || (party?.person ? (party.person.firstName + ' ' + party.person.familyName) : null)
                senderTax = party?.partyIdentification?.[0]?.value
            }

            if (!senderTitle) senderTitle = 'Bilinmeyen Tedarikçi'
            if (!senderTax) senderTax = '1111111111'

            // Use detailed info for invoice main fields if available, else summary
            const invToUse = detailedInv || inv

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
            // Priority: 1. JSON Detail Lines, 2. UBL XML Lines
            let lineItems = detailedInv?.invoiceLine || detailedInv?.lines || []

            // If JSON lines are missing/empty, try UBL
            if (!lineItems || lineItems.length === 0) {
                try {
                    console.log(`JSON lines missing for ${realUuid}, fetching UBL...`)
                    const ublRes = await fetch(`${apiUrl}einvoice/v1/incoming/invoices/${realUuid}/ubl`, {
                        headers: { 'Authorization': `Bearer ${apiKey}` }
                    })

                    if (ublRes.ok) {
                        const ublText = await ublRes.text()
                        const parser = new XMLParser({
                            ignoreAttributes: false,
                            removeNSPrefix: true, // fixed casing
                            attributeNamePrefix: "@_"
                        })
                        const ublObj = parser.parse(ublText)

                        // Navigate UBL structure: Invoice -> InvoiceLine (can be array or single object)
                        const root = ublObj.Invoice || ublObj.DespatchAdvice
                        if (root && root.InvoiceLine) {
                            lineItems = Array.isArray(root.InvoiceLine) ? root.InvoiceLine : [root.InvoiceLine]
                        }
                    }
                } catch (e) {
                    console.error('UBL Fetch/Parse Error:', e)
                }
            }

            if (Array.isArray(lineItems)) {
                for (const item of lineItems) {
                    // Extract item details
                    // HACK: Map UBL PascalCase fields to our camelCase logic or standard logic
                    // UBL keys: Item.Name, InvoicedQuantity, Price.PriceAmount

                    const productName = item.item?.name || item.Item?.Name || item.name || 'Hizmet/Ürün'

                    // Quantity
                    let quantity = 1
                    if (item.invoicedQuantity?.value) quantity = item.invoicedQuantity.value
                    else if (item.InvoicedQuantity && typeof item.InvoicedQuantity === 'object') quantity = item.InvoicedQuantity['#text'] || item.InvoicedQuantity
                    else if (item.InvoicedQuantity) quantity = item.InvoicedQuantity
                    else if (item.quantity) quantity = item.quantity

                    // Price
                    let unitPrice = 0
                    if (item.price?.priceAmount?.value) unitPrice = item.price.priceAmount.value
                    else if (item.Price?.PriceAmount && typeof item.Price?.PriceAmount === 'object') unitPrice = item.Price.PriceAmount['#text'] || item.Price.PriceAmount
                    else if (item.Price?.PriceAmount) unitPrice = item.Price.PriceAmount
                    else if (item.unitPrice) unitPrice = item.unitPrice

                    // Line Total
                    let lineTotal = quantity * unitPrice
                    if (item.lineExtensionAmount?.value) lineTotal = item.lineExtensionAmount.value
                    else if (item.LineExtensionAmount && typeof item.LineExtensionAmount === 'object') lineTotal = item.LineExtensionAmount['#text'] || item.LineExtensionAmount
                    else if (item.LineExtensionAmount) lineTotal = item.LineExtensionAmount
                    else if (item.total) lineTotal = item.total

                    // VAT Check
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
