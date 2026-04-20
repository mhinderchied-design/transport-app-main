import { Suspense } from 'react'
import { connection } from 'next/server'
import { createClient } from '@/lib/supabase/server'

async function RuntimeCheckContent() {
  await connection()

  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { data: roleData } = await supabase.rpc('app_get_current_role')

  const { data: roleForUser } = user?.id
    ? await supabase.rpc('app_get_role_for_user', {
        p_user_id: user.id,
      })
    : { data: null }

  return (
    <div style={{ padding: 20 }}>
      <h1>Phase 3 — Runtime Check</h1>

      <p><strong>User ID :</strong> {user?.id ?? 'NON CONNECTÉ'}</p>
      <p><strong>app_get_current_role() :</strong> {String(roleData)}</p>
      <p><strong>app_get_role_for_user(user.id) :</strong> {String(roleForUser)}</p>
    </div>
  )
}

export default function Page() {
  return (
    <Suspense fallback={<div style={{ padding: 20 }}>Chargement...</div>}>
      <RuntimeCheckContent />
    </Suspense>
  )
}
