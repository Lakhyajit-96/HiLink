import { NextResponse } from 'next/server'
import { prisma } from '@/app/lib/prisma'
import { hash } from 'bcryptjs'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const email = String(body?.email || '').toLowerCase().trim()
    const password = String(body?.password || '')
    const name = body?.name ? String(body.name).trim() : null
    const phone = body?.phone ? String(body.phone).trim() : null

    if (!email || !password || password.length < 8) {
      return NextResponse.json({ error: 'Invalid email or password' }, { status: 400 })
    }

    const existing = await prisma.user.findUnique({ where: { email } })
    if (existing) {
      return NextResponse.json({ error: 'User already exists' }, { status: 409 })
    }

    const passwordHash = await hash(password, 10)

    const user = await prisma.user.create({
      data: { email, name, phone, passwordHash },
      select: { id: true, email: true, name: true }
    })

    return NextResponse.json({ user }, { status: 201 })
  } catch (e) {
    return NextResponse.json({ error: 'Registration failed' }, { status: 500 })
  }
}
