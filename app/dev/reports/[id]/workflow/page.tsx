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

  // 🔹 On récupère l'utilisateur SANS faire planter la page
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  // 🔹 On récupère le rôle courant (pareil, sans throw)
  const { data: roleData, error: roleError } =
    await supabase.rpc("app_get_current_role");

  // 🔹 On récupère le rapport
  const { data: report, error: reportError } = await supabase
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
    .maybeSingle();

  return (
    <main className="mx-auto max-w-4xl p-6 space-y-6">
      <h1 className="text-2xl font-bold">
        Fiche de test métier — Workflow rapport
      </h1>

      {/* 🔹 Contexte utilisateur */}
      <section className="border p-4 rounded space-y-2">
        <h2 className="font-semibold">Contexte utilisateur</h2>

        <p>
          <strong>User ID :</strong>{" "}
          {user?.id ?? "NON CONNECTÉ"}
        </p>

        <p>
          <strong>Email :</strong>{" "}
          {user?.email ?? "—"}
        </p>

        <p>
          <strong>Erreur session :</strong>{" "}
          {userError?.message ?? "aucune"}
        </p>

        <p>
          <strong>Rôle courant :</strong>{" "}
          {roleData ?? "null"}
        </p>

        <p>
          <strong>Erreur rôle :</strong>{" "}
          {roleError?.message ?? "aucune"}
        </p>
      </section>

      {/* 🔹 Données rapport */}
      <section className="border p-4 rounded space-y-2">
        <h2 className="font-semibold">Rapport</h2>

        {reportError && (
          <p className="text-red-600">
            Erreur rapport : {reportError.message}
          </p>
        )}

        {!report && <p>Rapport introuvable</p>}

        {report && (
          <>
            <p>
              <strong>ID :</strong> {report.id}
            </p>

            <p>
              <strong>Status :</strong>{" "}
              {report.workflow_status ?? "null"}
            </p>

            <p>
              <strong>Locked :</strong>{" "}
              {String(report.workflow_locked)}
            </p>

            <p>
              <strong>Last changed at :</strong>{" "}
              {report.workflow_last_changed_at ?? "null"}
            </p>

            <p>
              <strong>Last changed by :</strong>{" "}
              {report.workflow_last_changed_by ?? "null"}
            </p>

            <p>
              <strong>saisi_par_chauffeur_id :</strong>{" "}
              {report.saisi_par_chauffeur_id ?? "null"}
            </p>

            <p>
              <strong>valide_chauffeur_at :</strong>{" "}
              {report.valide_chauffeur_at ?? "null"}
            </p>
          </>
        )}
      </section>
    </main>
  );
}

export default function Page(props: PageProps) {
  return (
    <Suspense fallback={<div>Chargement...</div>}>
      <WorkflowReportPageContent {...props} />
    </Suspense>
  );
}
