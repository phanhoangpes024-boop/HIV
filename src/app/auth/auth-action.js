'use server'

import { createClient } from '../../utils/supabase/server'
import { redirect } from 'next/navigation'

export async function signInWithGoogle() {
    const supabase = await createClient()

    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.epihouse.org'

    const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
            redirectTo: `${siteUrl}/auth/callback`,
        },
    })

    if (error) {
        console.error('Lỗi khi đăng nhập Google:', error.message)
        return redirect('/?error=Could not authenticate user')
    }

    if (data.url) {
        redirect(data.url)
    }
}

export async function signOutAction() {
    const supabase = await createClient()
    await supabase.auth.signOut()
}