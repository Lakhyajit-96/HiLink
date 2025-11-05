import { NextResponse } from 'next/server'
import Stripe from 'stripe'
import { prisma } from '@/app/lib/prisma'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function POST(req: Request) {
  const sig = req.headers.get('stripe-signature')
  const secret = process.env.STRIPE_WEBHOOK_SECRET
  const key = process.env.STRIPE_SECRET_KEY

  if (!sig || !secret || !key) {
    return NextResponse.json({ error: 'Stripe webhook not configured' }, { status: 500 })
  }

  const stripe = new Stripe(key)
  const raw = await req.text()

  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(raw, sig, secret)
  } catch (err) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session
        const bookingId = (session.metadata?.bookingId as string) || undefined
        if (session.payment_status === 'paid') {
          if (bookingId) {
            await prisma.booking.update({ where: { id: bookingId }, data: { status: 'CONFIRMED' } })
            await prisma.payment.update({ where: { bookingId }, data: { status: 'SUCCEEDED', providerTxnId: session.id } })
          }
        }
        break
      }
      case 'checkout.session.expired': {
        const session = event.data.object as Stripe.Checkout.Session
        const bookingId = (session.metadata?.bookingId as string) || undefined
        if (bookingId) {
          await prisma.payment.update({ where: { bookingId }, data: { status: 'EXPIRED', providerTxnId: session.id } }).catch(() => {})
          await prisma.booking.update({ where: { id: bookingId }, data: { status: 'CANCELLED' } }).catch(() => {})
        }
        break
      }
      case 'payment_intent.payment_failed': {
        const pi = event.data.object as Stripe.PaymentIntent
        const bookingId = (pi.metadata?.bookingId as string) || undefined
        if (bookingId) {
          await prisma.payment.update({ where: { bookingId }, data: { status: 'FAILED', providerTxnId: pi.id } }).catch(() => {})
          await prisma.booking.update({ where: { id: bookingId }, data: { status: 'CANCELLED' } }).catch(() => {})
        }
        break
      }
      default:
        break
    }
  } catch (err) {
    return NextResponse.json({ received: true, warning: 'handler error' })
  }

  return NextResponse.json({ received: true })
}
