import { Suspense } from "react";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { runReportWorkflowTransition, type ReportTransitionState } from "./actions";
import TransitionForm from "./transition-form";

type PageProps = {
  params: Promise<{
    id: string;
  }>;
};

type ReportRow = {
  id: number;
  societe_id: number | null;
  site_id: number | null;
  salarie_id: number | null;
  vehicule_id: number | null;
  client_id: number | null;
  site_client_id: number | null;
  date_rapport: string | null;
  workflow_status: string | null;
  workflow_locked: boolean | null;
  workflow_last_changed_at: string | null;
  workflow_last_changed_by: string | null;
  saisi_par_chauffeur_id: string | null;
  valide_chauffeur_at: string | null;
};

function formatWorkflowLabel(status: string | null) {
  switch (status) {
    case "brouillon":
      return "Brouillon";
    case "saisi_chauffeur":
      return "Saisi chauffeur";
    case "en_controle_admin":
      return "En contrôle admin";
    case "valide_admin":
      return "Validé admin";
    case "en_attente_prefacturation":
      return "En attente préfacturation";
    case "prefacture":
      return "Préfacturé";
    case "valide_super_admin":
      return "Validé super admin";
    case "verrouille":
      return "Verrouillé";
    default:
      return status ?? "Inconnu";
  }
}

function formatDate(value: string | null) {
  if (!value) return "—";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return new Intl.DateTimeFormat("fr-FR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

const initialTransitionState: ReportTransitionState = {
  transition_ok: false,
  old_status: null,
  new_status: null,
  transition_message: "Aucune transition lancée pour le moment.",
};

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
    .from("rapports_journaliers")
    .select(
      `
        id,
        societe_id,
        site_id,
        salarie_id,
        vehicule_id,
        client_id,
        site_client_id,
        date_rapport,
        workflow_status,
        workflow_locked,
        workflow_last_changed_at,
        workflow_last_changed_by,
        saisi_par_chauffeur_id,
        valide_chauffeur_at
      `
    )
    .eq("id", reportId)
    .maybeSingle<ReportRow>();

  return (
    <main className="mx-auto max-w-5xl p-6 text-white">
      <h1 className="mb-6 text-3xl font-bold">
        Rapport journalier #{reportId}
      </h1>

      <section className="mb-6 rounded-lg border border-white/20 p-4">
        <h2 className="mb-4 text-xl font-semibold">Contexte utilisateur</h2>

        <div className="space-y-2 text-sm md:text-base">
          <p><strong>User ID :</strong> {user?.id ?? "NON CONNECTÉ"}</p>
          <p><strong>Email :</strong> {user?.email ?? "—"}</p>
          <p><strong>Erreur session :</strong> {userError?.message ?? "aucune"}</p>
          <p><strong>Rôle courant :</strong> {currentRoleData ? String(currentRoleData) : "null"}</p>
          <p><strong>Erreur rôle :</strong> {currentRoleError?.message ?? "aucune"}</p>
        </div>
      </section>

      <section className="mb-6 rounded-lg border border-white/20 p-4">
        <h2 className="mb-4 text-xl font-semibold">Workflow</h2>

        {reportError ? (
          <p className="text-red-300">Erreur chargement rapport : {reportError.message}</p>
        ) : !report ? (
          <p>Rapport introuvable</p>
        ) : (
          <div className="grid gap-3 text-sm md:grid-cols-2 md:text-base">
            <p><strong>ID :</strong> {report.id}</p>
            <p><strong>Statut :</strong> {formatWorkflowLabel(report.workflow_status)}</p>
            <p><strong>Verrouillé :</strong> {report.workflow_locked ? "Oui" : "Non"}</p>
            <p><strong>Dernière modification :</strong> {formatDate(report.workflow_last_changed_at)}</p>
            <p><strong>Modifié par :</strong> {report.workflow_last_changed_by ?? "—"}</p>
            <p><strong>Saisi par chauffeur :</strong> {report.saisi_par_chauffeur_id ?? "—"}</p>
            <p><strong>Validation chauffeur :</strong> {formatDate(report.valide_chauffeur_at)}</p>
          </div>
        )}
      </section>

      <section className="mb-6 rounded-lg border border-white/20 p-4">
        <h2 className="mb-4 text-xl font-semibold">Résumé métier</h2>

        {reportError ? (
          <p className="text-red-300">Impossible d’afficher le résumé métier.</p>
        ) : !report ? (
          <p>Rapport introuvable</p>
        ) : (
          <div className="grid gap-3 text-sm md:grid-cols-2 md:text-base">
            <p><strong>Société :</strong> {report.societe_id ?? "—"}</p>
            <p><strong>Site :</strong> {report.site_id ?? "—"}</p>
            <p><strong>Salarié :</strong> {report.salarie_id ?? "—"}</p>
            <p><strong>Véhicule :</strong> {report.vehicule_id ?? "—"}</p>
            <p><strong>Client :</strong> {report.client_id ?? "—"}</p>
            <p><strong>Site client :</strong> {report.site_client_id ?? "—"}</p>
            <p><strong>Date rapport :</strong> {formatDate(report.date_rapport)}</p>
          </div>
        )}
      </section>

      {report && (
        <section className="rounded-lg border border-white/20 p-4">
          <h2 className="mb-4 text-xl font-semibold">Actions workflow</h2>

          <TransitionForm
            reportId={report.id}
            currentStatus={report.workflow_status}
            isLocked={Boolean(report.workflow_locked)}
            initialState={initialTransitionState}
            action={runReportWorkflowTransition}
          />
        </section>
      )}
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
