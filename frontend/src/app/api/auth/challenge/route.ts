import { NextResponse } from 'next/server'

export const runtime = 'edge'

export async function GET() {
  const timestamp = Date.now()
  return NextResponse.json({ timestamp })
}
