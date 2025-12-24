import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'

export default async function Home() {
  const cookieStore = await cookies()
  const authCookie = cookieStore.get('finans_auth')

  // Kullanıcı giriş yapmışsa dashboard'a yönlendir
  if (authCookie && authCookie.value === 'authenticated') {
    redirect('/dashboard')
  }

  // Giriş yapmamışsa login sayfasına yönlendir
  redirect('/login')
}
