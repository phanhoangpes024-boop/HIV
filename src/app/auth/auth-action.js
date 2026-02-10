'use server'

import { createClient } from '../../utils/supabase/server'
import { redirect } from 'next/navigation'
import { headers } from 'next/headers'

export async function signInWithGoogle() {
    const supabase = await createClient()
    const headerList = await headers()
    const origin = headerList.get('origin')

    const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
            redirectTo: `${origin}/auth/callback`,
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
