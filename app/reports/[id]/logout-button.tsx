"use client";

import { useRouter } from "next/navigation";
// ❌ chemin volontairement faux pour déclencher l’erreur
import { createClient } from "@/supabase/client";

export default function LogoutButton() {
  const router = useRouter();
  const supabase = createClient();

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <button onClick={handleLogout}>
      Se déconnecter
    </button>
  );
}
