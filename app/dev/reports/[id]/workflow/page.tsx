import { Suspense } from "react";
import { connection } from "next/server";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

type PageProps = {
  params: Promise<{
    id: string;
  }>;
};

async function WorkflowReportPageContent({ params }: PageProps) {
  await connection();

  const { id } = await params;
  const reportId = Number(id);

  if (!Number.isInteger(reportId) || reportId <= 0) {
    notFound();
  }

  const supabase = await createClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError) {
    throw new Error(`Erreur récupération utilisateur: ${userError.message}`);
  }

  const [{ data: roleData, error: roleError }, { data: report, error: reportError }] =
    await Promise.all([
      supabase.rpc("app_get_current_role"),
      supabase
        .from("rapports_journaliers")
        .select(`
          id,
          workflow_status,
          workflow_locked,
          workflow_last_changed_at,
          workflow_last_changed_by,
          saisi_par_chauffeur_id,
          valide_chauffeur_at
        `)
        .eq("id", reportId)
        .single(),
    ]);

  if (roleError) {
    throw new Error(`Erreur récupération rôle courant: ${roleError.message}`);
  }

  if (reportError) {
    if (reportError.code === "PGRST116") {
      notFound();
    }
    throw new Error(`Erreur récupération rapport: ${reportError.message}`);
  }

  return (
    <main className="mx-auto max-w-4xl p-6 space-y-6">
      <header className="space-y-2">
        <h1 className="text-2xl font-bold">Fiche de test métier — Workflow rapport</h1>
        <p className="text-sm text-gray-600">
          Étape 4.1 — lecture seule du contexte connecté et de l’état workflow
        </p>
      </header>

      <section className="rounded-2xl border p-4 space-y-3">
        <h2 className="text-lg font-semibold">Contexte utilisateur</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <p className="text-sm text-gray-500">Utilisateur connecté</p>
            <p className="font-mono break-all">{user?.id ?? "NON CONNECTÉ"}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Rôle courant</p>
            <p className="font-medium">{roleData ?? "null"}</p>
          </div>
          <div className="sm:col-span-2">
            <p className="text-sm text-gray-500">Email</p>
            <p>{user?.email ?? "—"}</p>
          </div>
        </div>
      </section>

      <section className="rounded-2xl border p-4 space-y-3">
        <h2 className="text-lg font-semibold">Rapport</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <p className="text-sm text-gray-500">ID rapport</p>
            <p className="font-medium">{report.id}</p>
          </div>

          <div>
            <p className="text-sm text-gray-500">workflow_status</p>
            <p className="font-medium">{report.workflow_status ?? "null"}</p>
          </div>

          <div>
            <p className="text-sm text-gray-500">workflow_locked</p>
            <p className="font-medium">{String(report.workflow_locked)}</p>
          </div>

          <div>
            <p className="text-sm text-gray-500">workflow_last_changed_at</p>
            <p>{report.workflow_last_changed_at ?? "null"}</p>
          </div>

          <div className="sm:col-span-2">
            <p className="text-sm text-gray-500">workflow_last_changed_by</p>
            <p className="font-mono break-all">
              {report.workflow_last_changed_by ?? "null"}
            </p>
          </div>
        </div>
      </section>

      <section className="rounded-2xl border p-4 space-y-3">
        <h2 className="text-lg font-semibold">Legacy utile au contrôle</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <p className="text-sm text-gray-500">saisi_par_chauffeur_id</p>
            <p className="font-mono break-all">
              {report.saisi_par_chauffeur_id ?? "null"}
            </p>
          </div>

          <div>
            <p className="text-sm text-gray-500">valide_chauffeur_at</p>
            <p>{report.valide_chauffeur_at ?? "null"}</p>
          </div>
        </div>
      </section>
    </main>
  );
}

export default function WorkflowReportPage(props: PageProps) {
  return (
    <Suspense fallback={<div className="p-6">Chargement de la fiche workflow…</div>}>
      <WorkflowReportPageContent {...props} />
    </Suspense>
  );
}
