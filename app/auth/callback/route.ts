import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const redirect = searchParams.get('redirect')
  const priceId = searchParams.get('priceId')

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    
    if (!error) {
      // Successful email confirmation
      if (redirect === 'pricing' && priceId) {
        return NextResponse.redirect(`${origin}/pricing?priceId=${priceId}`)
      } else if (redirect === 'checkout' && priceId) {
        return NextResponse.redirect(`${origin}/pricing?priceId=${priceId}`)
      } else if (redirect) {
        return NextResponse.redirect(`${origin}/${redirect}`)
      }
      return NextResponse.redirect(`${origin}/`)
    } else {
      // Log the error for debugging
      console.error('Auth callback error:', error)
      return NextResponse.redirect(`${origin}/sign-in?error=${encodeURIComponent(error.message)}`)
    }
  }

  // If there's an error or no code, redirect to sign-in
  return NextResponse.redirect(`${origin}/sign-in?error=auth_callback_error`)
}