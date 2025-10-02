import { useEffect } from 'react'
import { useRouter } from 'next/router'
import { supabase } from './supabaseClient'  // ← これが重要


export default function withAuth(Component: React.FC) {
  return function ProtectedComponent(props: any) {
    const router = useRouter()

    useEffect(() => {
      const checkAuth = async () => {
        const {
          data: { session }
        } = await supabase.auth.getSession()
        if (!session) {
          router.replace('/login')
        }
      }
      checkAuth()
    }, [router])

    return <Component {...props} />
  }
}
