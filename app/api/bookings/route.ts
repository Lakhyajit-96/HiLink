import { NextResponse } from 'next/server'
import { prisma } from '@/app/lib/prisma'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { productId, startDate, quantity = 1, customerName, customerEmail, customerPhone } = body || {}

    if (!productId || !startDate || !customerName || !customerEmail) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const product = await prisma.product.findUnique({ where: { id: productId } })
    if (!product) return NextResponse.json({ error: 'Product not found' }, { status: 404 })

    const total = (product.basePriceINR || 0) * Number(quantity || 1)

    const booking = await prisma.booking.create({
      data: {
        productId,
        startDate: new Date(startDate),
        quantity: Number(quantity || 1),
        totalAmountINR: total,
        customerName,
        customerEmail,
        customerPhone: customerPhone || null,
      },
    })

    return NextResponse.json({ booking })
  } catch (err) {
    return NextResponse.json({ error: 'Failed to create booking' }, { status: 500 })
  }
}
