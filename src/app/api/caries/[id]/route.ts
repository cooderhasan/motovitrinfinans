import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { CariType, CurrencyCode } from '@prisma/client'

// GET /api/caries/[id]
export async function GET(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params
        const cari = await db.cari.findUnique({
            where: { id: parseInt(id) },
            include: {
                defaultCurrency: true
            }
        })

        if (!cari) {
            return NextResponse.json({ error: 'Cari bulunamadı.' }, { status: 404 })
        }

        return NextResponse.json(cari)
    } catch (error) {
        console.error('Cari detay hatası:', error)
        return NextResponse.json({ error: 'Cari bilgisi alınırken hata oluştu.' }, { status: 500 })
    }
}

// PUT /api/caries/[id]
export async function PUT(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params
        const cariId = parseInt(id)
        const body = await request.json()

        // Mevcut cari'yi kontrol et
        const existingCari = await db.cari.findUnique({
            where: { id: cariId }
        })

        if (!existingCari) {
            return NextResponse.json({ error: 'Cari bulunamadı.' }, { status: 404 })
        }

        // Güncellenebilir alanlar
        const updateData: any = {}

        if (body.title) updateData.title = body.title
        if (body.type) updateData.type = body.type as CariType
        if (body.phone !== undefined) updateData.phone = body.phone
        if (body.email !== undefined) updateData.email = body.email
        if (body.address !== undefined) updateData.address = body.address
        if (body.city !== undefined) updateData.city = body.city
        if (body.district !== undefined) updateData.district = body.district
        if (body.taxNumber !== undefined) updateData.taxNumber = body.taxNumber
        if (body.taxOffice !== undefined) updateData.taxOffice = body.taxOffice
        if (body.notes !== undefined) updateData.notes = body.notes
        if (body.isActive !== undefined) updateData.isActive = body.isActive
        if (body.salary !== undefined) updateData.salary = body.salary

        // Para birimi değişikliği
        if (body.defaultCurrencyCode) {
            const currency = await db.currency.findUnique({
                where: { code: body.defaultCurrencyCode as CurrencyCode }
            })
            if (currency) {
                updateData.defaultCurrencyId = currency.id
            }
        }

        const updated = await db.cari.update({
            where: { id: cariId },
            data: updateData,
            include: { defaultCurrency: true }
        })

        return NextResponse.json(updated)
    } catch (error: any) {
        console.error('Cari güncelleme hatası:', error)
        return NextResponse.json({
            error: 'Cari güncellenirken hata oluştu.',
            details: error.message
        }, { status: 500 })
    }
}

// DELETE /api/caries/[id]
export async function DELETE(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params
        const cariId = parseInt(id)

        // İlişkili kayıtları kontrol et
        const hasInvoices = await db.invoice.count({ where: { supplierId: cariId } })
        const hasSales = await db.salesSlip.count({ where: { customerId: cariId } })
        const hasPayments = await db.payment.count({ where: { cariId: cariId } })
        const hasTransactions = await db.cashTransaction.count({ where: { cariId: cariId } })

        if (hasInvoices > 0 || hasSales > 0 || hasPayments > 0 || hasTransactions > 0) {
            return NextResponse.json({
                error: 'Bu cariye ait fatura, satış, ödeme veya hareket kaydı bulunduğu için silinemez. Pasif yapabilirsiniz.'
            }, { status: 400 })
        }

        await db.cari.delete({
            where: { id: cariId }
        })

        return NextResponse.json({ success: true })
    } catch (error) {
        console.error('Cari silme hatası:', error)
        return NextResponse.json({ error: 'Cari silinirken hata oluştu.' }, { status: 500 })
    }
}
