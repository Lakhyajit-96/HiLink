import { NextResponse } from 'next/server'
import { prisma } from '@/app/lib/prisma'

export async function GET() {
  try {
    const destinations = await prisma.destination.findMany({
      orderBy: { name: 'asc' },
      take: 100,
    })
    return NextResponse.json({ destinations })
  } catch (err) {
    return NextResponse.json(
      { error: 'Database not configured or unavailable' },
      { status: 503 }
    )
  }
}
