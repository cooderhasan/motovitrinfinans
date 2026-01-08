
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
    console.log('🔍 NES API yanıt yapısı inceleniyor...')

    // 1. Get Settings
    const settings = await prisma.settings.findMany({
        where: { key: { in: ['nesApiKey', 'nesApiUrl'] } }
    })

    const settingsMap = settings.reduce((acc: any, curr) => {
        acc[curr.key] = curr.value || ''
        return acc
    }, {})

    const apiKey = settingsMap['nesApiKey']
    const apiUrl = settingsMap['nesApiUrl'] || 'https://api.nes.com.tr/'

    if (!apiKey) {
        console.error('❌ API Anahtarı bulunamadı!')
        return
    }

    // 2. Fetch 1 Invoice
    console.log('📡 NES API\'ye bağlanılıyor...')
    const response = await fetch(`${apiUrl}einvoice/v1/incoming/invoices?pageSize=1`, {
        headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json'
        }
    })

    if (!response.ok) {
        console.error('❌ API Hatası:', await response.text())
        return
    }

    const data = await response.json()
    const invoices = data.data || []

    if (invoices.length === 0) {
        console.log('⚠️ Hiç fatura bulunamadı.')
        return
    }

    const inv = invoices[0]
    console.log('✅ Fatura Verisi Alındı. İşte Ünvan ve Satır detayları:')
    console.log('--------------------------------------------------')

    // Inspect Sender
    console.log('SENDER (Gönderici) Object Keys:', Object.keys(inv.sender || {}))
    console.log('SENDER RAW:', JSON.stringify(inv.sender, null, 2))

    // Inspect Lines
    if (inv.lines) console.log('Found "lines" array. Length:', inv.lines.length)
    if (inv.invoiceLine) console.log('Found "invoiceLine" array. Length:', inv.invoiceLine.length)

    console.log('FULL INVOICE KEYS:', Object.keys(inv))
    console.log('--------------------------------------------------')
}

main()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect())
