import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'

// POST /api/auth/login
export async function POST(request: Request) {
    try {
        const body = await request.json()
        const { password } = body

        // Get password from environment variable
        const correctPassword = process.env.APP_PASSWORD || 'finans2024'

        if (password === correctPassword) {
            // Create response with success
            const response = NextResponse.json({ success: true })

            // Set auth cookie (httpOnly for security)
            response.cookies.set('finans_auth', 'authenticated', {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                sameSite: 'lax',
                maxAge: 60 * 60 * 24 * 7 // 7 days
            })

            return response
        } else {
            return NextResponse.json({ error: 'Yanlis sifre' }, { status: 401 })
        }
    } catch (error) {
        console.error('Login error:', error)
        return NextResponse.json({ error: 'Giris hatasi' }, { status: 500 })
    }
}

// DELETE /api/auth/login (logout)
export async function DELETE() {
    const response = NextResponse.json({ success: true })

    // Clear auth cookie
    response.cookies.delete('finans_auth')

    return response
}

// GET /api/auth/login (check auth status)
export async function GET() {
    const cookieStore = await cookies()
    const authCookie = cookieStore.get('finans_auth')

    if (authCookie && authCookie.value === 'authenticated') {
        return NextResponse.json({ authenticated: true })
    }

    return NextResponse.json({ authenticated: false })
}
