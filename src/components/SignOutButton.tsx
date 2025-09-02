// components/SignOutButton.tsx
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'

export default function SignOutButton({className, callbackURL}: {className?: string, callbackURL: string}) {
    const supabase = createClient()
    const router = useRouter()
    const [loading, setLoading] = useState(false);

    async function handleSignOut() {
        try {
            setLoading(true);
            await supabase.auth.signOut()
            localStorage.removeItem('supabase.auth.token')
            router.replace(callbackURL)
            router.refresh()
        } finally {
            setLoading(false)
        }
    }

    return (
        <button className={className} onClick={handleSignOut} disabled={loading}>
            Log Out
        </button>
    )
}
