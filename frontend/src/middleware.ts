import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { jwtVerify } from 'jose'

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key'

export async function middleware(request: NextRequest) {
  // Only protect /api/casino routes
  if (!request.nextUrl.pathname.startsWith('/api/casino')) {
    return NextResponse.next()
  }

  const token = request.cookies.get('auth_token')?.value

  if (!token) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
  }

  try {
    const { payload } = await jwtVerify(token, new TextEncoder().encode(JWT_SECRET))
    const requestBody = await request.json().catch(() => ({}))

    if (requestBody.pubkey && payload.sub !== requestBody.pubkey) {
      return NextResponse.json({ error: 'Invalid pubkey' }, { status: 401 })
    }

    return NextResponse.next()
  } catch (error) {
    console.log(error)
    return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
  }
}

export const config = {
  matcher: '/api/casino/:path*',
}
