import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// Protected routes that require authentication
const protectedPaths = ['/finance', '/dashboard', '/api/caries', '/api/invoices', '/api/sales', '/api/payments', '/api/reports', '/api/settings']

// Public paths that don't require authentication
const publicPaths = ['/login', '/api/auth']

export function middleware(request: NextRequest) {
    const { pathname } = request.nextUrl

    // Skip public paths
    if (publicPaths.some(path => pathname.startsWith(path))) {
        return NextResponse.next()
    }

    // Check if path requires protection
    const isProtectedPath = protectedPaths.some(path => pathname.startsWith(path))

    if (isProtectedPath) {
        // Check for auth cookie
        const authCookie = request.cookies.get('finans_auth')

        if (!authCookie || authCookie.value !== 'authenticated') {
            // Redirect to login
            const loginUrl = new URL('/login', request.url)
            loginUrl.searchParams.set('redirect', pathname)
            return NextResponse.redirect(loginUrl)
        }
    }

    return NextResponse.next()
}

export const config = {
    matcher: [
        '/((?!_next/static|_next/image|favicon.ico|.*\\.png$|.*\\.jpg$|.*\\.svg$).*)',
    ],
}
