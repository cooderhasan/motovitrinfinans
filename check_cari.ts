
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
    const vkn = '1750421291'
    console.log(`Searching for Cari with taxNumber: ${vkn}`)

    const cari = await prisma.cari.findFirst({
        where: { taxNumber: vkn }
    })

    if (cari) {
        console.log('Found Cari:', {
            id: cari.id,
            title: cari.title,
            address: cari.address,
            city: cari.city,
            taxOffice: cari.taxOffice,
            email: cari.email
        })
    } else {
        console.log('No Cari found with this VKN.')
    }
}

main()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect())
