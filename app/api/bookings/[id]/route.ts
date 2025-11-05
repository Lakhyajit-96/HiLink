import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/app/lib/prisma'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })

  try {
    const booking = await prisma.booking.findUnique({
      where: { id },
      include: {
        product: { include: { destination: true } },
        payment: true,
      },
    })

    if (!booking) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    return NextResponse.json({ booking })
  } catch (e) {
    return NextResponse.json({ error: 'Failed to fetch booking' }, { status: 500 })
  }
}
