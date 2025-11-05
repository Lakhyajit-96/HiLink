import { NextResponse } from 'next/server'
import Stripe from 'stripe'
import { prisma } from '@/app/lib/prisma'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { productId, quantity = 1, startDate, customerName, customerEmail, customerPhone } = body || {}

    if (!process.env.STRIPE_SECRET_KEY) {
      return NextResponse.json({ error: 'Stripe is not configured' }, { status: 500 })
    }

    if (!productId || !startDate || !customerName || !customerEmail) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const product = await prisma.product.findUnique({ where: { id: productId } })
    if (!product) return NextResponse.json({ error: 'Product not found' }, { status: 404 })

    const qty = Number(quantity || 1)
    const totalINR = (product.basePriceINR || 0) * qty

    // Create pending booking first
    const booking = await prisma.booking.create({
      data: {
        productId,
        startDate: new Date(startDate),
        quantity: qty,
        totalAmountINR: totalINR,
        customerName,
        customerEmail,
        customerPhone: customerPhone || null,
      },
    })

    // Create Payment record (pending)
    await prisma.payment.create({
      data: {
        bookingId: booking.id,
        gateway: 'STRIPE',
        status: 'CREATED',
        amountINR: totalINR,
      },
    })

    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)

    const origin = process.env.APP_URL || 'http://localhost:3000'

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'inr',
            product_data: { name: product.title },
            unit_amount: (product.basePriceINR || 0) * 100, // paise
          },
          quantity: qty,
        },
      ],
      success_url: `${origin}/?success=1&booking=${booking.id}`,
      cancel_url: `${origin}/?canceled=1&booking=${booking.id}`,
      metadata: { bookingId: booking.id },
    })

    // store session id on payment
    await prisma.payment.update({ where: { bookingId: booking.id }, data: { providerTxnId: session.id } })

    return NextResponse.json({ bookingId: booking.id, sessionId: session.id, url: session.url })
  } catch (err) {
    return NextResponse.json({ error: 'Failed to create checkout session' }, { status: 500 })
  }
}
