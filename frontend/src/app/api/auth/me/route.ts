import { jwtVerify } from 'jose'
import { NextRequest, NextResponse } from 'next/server'

const secret = new TextEncoder().encode(process.env.JWT_SECRET!)
export const runtime = 'edge'

export async function GET(req: NextRequest) {
  const token = req.cookies.get('auth_token')?.value
  if (!token) return NextResponse.json({ ok: false }, { status: 401 })

  try {
    const { payload } = await jwtVerify(token, secret)
    // TODO: rolling sessions, if cookie about to expire, return a new one
    return NextResponse.json({ ok: true, pubkey: payload.sub })
  } catch {
    return NextResponse.json({ ok: false }, { status: 401 })
  }
}
