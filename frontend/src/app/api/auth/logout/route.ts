import { NextResponse } from 'next/server'

export const runtime = 'edge'

export async function POST() {
  const response = NextResponse.json({ success: true })

  // Delete the authentication cookie
  response.cookies.delete('auth_token')

  return response
}
