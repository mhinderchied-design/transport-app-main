import { Suspense } from "react";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { createClient } from "@/lib/supabase/server";

type PageProps = {
  params: Promise<{
    id: string;
  }>;
};

type ReportRow = {
  rapport_id: number;
  workflow_status: string | null;
  workflow_locked: boolean | null;
  workflow_last_changed_at: string | null;
  workflow_last_changed_by: string | null;
  workflow_status_label: string | null;
  workflow_status_badge_variant: string | null;
  workflow_status_badge_color: string | null;
};

function formatDate(value: string | null) {
  if (!value) return "—";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return new Intl.DateTimeFormat("fr-FR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

async function ReportPageContent({ params }: PageProps) {
  await connection();

  const { id } = await params;
  const reportId = Number(id);

  if (!Number.isFinite(reportId)) {
    notFound();
  }

  const supabase = await createClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  const { data: currentRoleData, error: currentRoleError } = await supabase.rpc(
    "app_get_current_role"
  );

  const { data: report, error: reportError } = await supabase
    .from("v_report_workflow_overview_with_badges")
    .select(
      `
        rapport_id,
        workflow_status,
        workflow_locked,
        workflow_last_changed_at,
        workflow_last_changed_by,
        workflow_status_label,
        workflow_status_badge_variant,
        workflow_status_badge_color
      `
    )
    .eq("rapport_id", reportId)
    .maybeSingle<ReportRow>();

  return (
    <main className="mx-auto max-w-5xl p-6 text-white">
      <h1 className="mb-6 text-3xl font-bold">
        Rapport journalier #{reportId}
      </h1>

      <section className="mb-6 rounded-lg border border-white/20 p-4">
        <h2 className="mb-4 text-xl font-semibold">Contexte utilisateur</h2>

        <div className="space-y-2 text-sm md:text-base">
          <p>
            <strong>User ID :</strong> {user?.id ?? "NON CONNECTÉ"}
          </p>
          <p>
            <strong>Email :</strong> {user?.email ?? "—"}
          </p>
          <p>
            <strong>Erreur session :</strong> {userError?.message ?? "aucune"}
          </p>
          <p>
            <strong>Rôle courant :</strong>{" "}
            {currentRoleData ? String(currentRoleData) : "null"}
          </p>
          <p>
            <strong>Erreur rôle :</strong>{" "}
            {currentRoleError?.message ?? "aucune"}
          </p>
        </div>
      </section>

      <section className="mb-6 rounded-lg border border-white/20 p-4">
        <h2 className="mb-4 text-xl font-semibold">Workflow</h2>

        {reportError ? (
          <p className="text-red-300">
            Erreur chargement rapport : {reportError.message}
          </p>
        ) : !report ? (
          <p>Rapport introuvable</p>
        ) : (
          <div className="grid gap-3 text-sm md:grid-cols-2 md:text-base">
            <p>
              <strong>ID :</strong> {report.rapport_id}
            </p>

            <p>
              <strong>Statut :</strong>{" "}
              <span
                className="inline-flex rounded-md px-2 py-1 text-xs font-semibold text-white"
                style={{
                  backgroundColor:
                    report.workflow_status_badge_color || "#6b7280",
                }}
              >
                {report.workflow_status_label ?? report.workflow_status ?? "Inconnu"}
              </span>
            </p>

            <p>
              <strong>Statut technique :</strong>{" "}
              {report.workflow_status ?? "—"}
            </p>

            <p>
              <strong>Verrouillé :</strong>{" "}
              {report.workflow_locked ? "Oui" : "Non"}
            </p>

            <p>
              <strong>Dernière modification :</strong>{" "}
              {formatDate(report.workflow_last_changed_at)}
            </p>

            <p>
              <strong>Modifié par :</strong>{" "}
              {report.workflow_last_changed_by ?? "—"}
            </p>
          </div>
        )}
      </section>

      <section className="mb-6 rounded-lg border border-white/20 p-4">
        <h2 className="mb-4 text-xl font-semibold">Résumé métier</h2>

        <p className="text-sm text-white/80 md:text-base">
          Le résumé métier complet sera reconnecté ensuite, après validation
          définitive du badge.
        </p>
      </section>

      <section className="rounded-lg border border-dashed border-white/20 p-4">
        <h2 className="mb-2 text-xl font-semibold">Suite prévue</h2>
        <p className="text-sm text-white/80 md:text-base">
          Après validation du badge, on passe à l’étape 2 : verrouillage visuel.
        </p>
      </section>
    </main>
  );
}

export default function ReportPage(props: PageProps) {
  return (
    <Suspense fallback={<div className="p-6 text-white">Chargement du rapport…</div>}>
      <ReportPageContent {...props} />
    </Suspense>
  );
}
