import { createClient } from '@/lib/supabase/server'

export default async function Page() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { data: roleData } = await supabase.rpc('app_get_current_role')

  const { data: roleForUser } = await supabase.rpc('app_get_role_for_user', {
    p_user_id: user?.id,
  })

  return (
    <div style={{ padding: 20 }}>
      <h1>Phase 3 — Runtime Check</h1>

      <p><strong>User ID :</strong> {user?.id ?? 'NULL'}</p>
      <p><strong>app_get_current_role() :</strong> {String(roleData)}</p>
      <p><strong>app_get_role_for_user(user.id) :</strong> {String(roleForUser)}</p>
    </div>
  )
}
