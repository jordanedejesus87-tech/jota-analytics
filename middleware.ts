import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return request.cookies.getAll() },
        setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()

  const { pathname } = request.nextUrl

  // Rotas protegidas
  if (pathname.startsWith('/dashboard')) {
    if (!user) {
      return NextResponse.redirect(new URL('/login', request.url))
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    const role = profile?.role ?? 'client'

    // commercial → /dashboard/comercial (nunca vê DFC)
    if (pathname === '/dashboard' && role === 'commercial') {
      return NextResponse.redirect(new URL('/dashboard/comercial', request.url))
    }

    // DFC (/dashboard) bloqueado para commercial
    if (pathname === '/dashboard' && !['admin', 'system', 'client'].includes(role)) {
      return NextResponse.redirect(new URL('/dashboard/comercial', request.url))
    }

    // /dashboard/admin: apenas admin e system
    if (pathname.startsWith('/dashboard/admin')) {
      if (!['admin', 'system'].includes(role)) {
        return NextResponse.redirect(new URL('/dashboard/comercial', request.url))
      }
    }

    // /dashboard/comercial: apenas admin, system e commercial
    if (pathname.startsWith('/dashboard/comercial')) {
      if (!['admin', 'system', 'commercial'].includes(role)) {
        return NextResponse.redirect(new URL('/dashboard', request.url))
      }
    }
  }

  // Redirecionar login para destino correto por role
  if (pathname.startsWith('/login')) {
    if (user) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single()

      const role = profile?.role ?? 'client'
      if (role === 'commercial') {
        return NextResponse.redirect(new URL('/dashboard/comercial', request.url))
      }
      return NextResponse.redirect(new URL('/dashboard', request.url))
    }
    return supabaseResponse
  }

  return supabaseResponse
}

export const config = {
  matcher: ['/dashboard/:path*', '/login'],
}
