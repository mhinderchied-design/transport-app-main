import { Suspense } from "react";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  runReportWorkflowTransition,
  type ReportTransitionState,
} from "./actions";
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

type WorkflowStatusBadge = {
  code: string;
  label: string;
  badge_variant: string;
  badge_color: string | null;
};

type TransitionRow = {
  to_status: string;
};

type WorkflowLogRow = {
  id: number;
  old_status: string | null;
  old_status_label: string | null;
  new_status: string | null;
  new_status_label: string | null;
  changed_role: string | null;
  comment_text: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string | null;
};

const ALL_WORKFLOW_STATUSES = [
  "brouillon",
  "saisi_chauffeur",
  "en_controle_admin",
  "valide_admin",
  "en_attente_prefacturation",
  "prefacture",
  "valide_super_admin",
  "verrouille",
];

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

function getStatusBadge(
  status: string | null,
  label: string,
  color: string | null
) {
  if (!status) return null;

  const base =
    "inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold shadow-sm";

  const map: Record<string, string> = {
    brouillon: "border-gray-500/40 bg-gray-500/15 text-gray-200",
    saisi_chauffeur: "border-blue-500/50 bg-blue-500/15 text-blue-200",
    en_controle_admin: "border-yellow-500/50 bg-yellow-500/15 text-yellow-200",
    valide_admin: "border-green-500/50 bg-green-500/15 text-green-200",
    en_attente_prefacturation:
      "border-orange-500/50 bg-orange-500/15 text-orange-200",
    prefacture: "border-purple-500/50 bg-purple-500/15 text-purple-200",
    valide_super_admin:
      "border-emerald-500/50 bg-emerald-500/15 text-emerald-200",
    verrouille: "border-red-500/50 bg-red-500/15 text-red-200",
  };

  const iconStyle: Record<string, string> = {
    brouillon: "bg-gray-300 text-gray-900",
    saisi_chauffeur: "bg-blue-300 text-blue-950",
    en_controle_admin: "bg-yellow-300 text-yellow-950",
    valide_admin: "bg-green-300 text-green-950",
    en_attente_prefacturation: "bg-orange-300 text-orange-950",
    prefacture: "bg-purple-300 text-purple-950",
    valide_super_admin: "bg-emerald-300 text-emerald-950",
    verrouille: "bg-red-300 text-red-950",
  };

  const icon: Record<string, string> = {
    brouillon: "•",
    saisi_chauffeur: "●",
    en_controle_admin: "⏳",
    valide_admin: "✓",
    en_attente_prefacturation: "⌛",
    prefacture: "◆",
    valide_super_admin: "✓",
    verrouille: "🔒",
  };

  return (
    <span
      className={`${base} ${
        map[status] ?? "border-white/20 bg-white/10 text-white"
      }`}
    >
      <span
        className={`flex h-4 w-4 items-center justify-center rounded-full text-[10px] ${
          iconStyle[status] ?? "bg-white/40 text-black"
        }`}
        style={
          !iconStyle[status]
            ? { backgroundColor: color ?? "#6b7280" }
            : undefined
        }
      >
        {icon[status] ?? "•"}
      </span>

      {label}
    </span>
  );
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

  const currentRole = currentRoleData ? String(currentRoleData) : null;

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

  const { data: workflowLogsRaw, error: workflowLogsError } = await supabase
    .from("app_report_workflow_log")
    .select(
      `
        id,
        old_status,
        new_status,
        changed_role,
        comment_text,
        metadata,
        created_at
      `
    )
    .eq("rapport_id", reportId)
    .order("created_at", { ascending: false });

  const { data: statusesData } = await supabase
    .from("report_workflow_statuses")
    .select("code, label");

  const statusMap: Record<string, string> = {};

  statusesData?.forEach((status) => {
    statusMap[status.code] = status.label;
  });

  const formattedWorkflowLogs: WorkflowLogRow[] =
    workflowLogsRaw?.map((log) => ({
      id: log.id,
      old_status: log.old_status,
      old_status_label:
        statusMap[log.old_status ?? ""] ?? formatWorkflowLabel(log.old_status),
      new_status: log.new_status,
      new_status_label:
        statusMap[log.new_status ?? ""] ?? formatWorkflowLabel(log.new_status),
      changed_role: log.changed_role,
      comment_text: log.comment_text,
      metadata: log.metadata,
      created_at: log.created_at,
    })) ?? [];

  let statusBadge: WorkflowStatusBadge | null = null;

  if (report?.workflow_status) {
    const { data: badgeData } = await supabase
      .from("report_workflow_statuses")
      .select("code, label, badge_variant, badge_color")
      .eq("code", report.workflow_status)
      .maybeSingle<WorkflowStatusBadge>();

    statusBadge = badgeData ?? null;
  }

  let allowedTransitions: string[] = [];

  if (report?.workflow_status && currentRole && !report.workflow_locked) {
    if (currentRole === "super_super_admin") {
      allowedTransitions = ALL_WORKFLOW_STATUSES.filter(
        (status) => status !== report.workflow_status
      );
    } else {
      const { data: transitionsData } = await supabase
        .from("app_report_workflow_transitions")
        .select("to_status")
        .eq("from_status", report.workflow_status)
        .eq("allowed_role", currentRole)
        .eq("is_active", true)
        .returns<TransitionRow[]>();

      allowedTransitions = transitionsData?.map((t) => t.to_status) ?? [];
    }
  }

  const workflowLabel =
    statusBadge?.label ?? formatWorkflowLabel(report?.workflow_status ?? null);

  const workflowBadgeColor = statusBadge?.badge_color ?? "#6b7280";

  const isLocked = Boolean(report?.workflow_locked);

  return (
    <main className="mx-auto max-w-5xl p-6 text-white">
      <h1 className="mb-6 text-3xl font-bold">Rapport journalier #{reportId}</h1>

      {isLocked && (
        <section className="mb-6 rounded-lg border border-red-400 bg-red-950/40 p-4 text-red-100">
          <h2 className="mb-2 text-xl font-semibold">Rapport verrouillé</h2>
          <p>
            Ce rapport est verrouillé. Les transitions workflow sont désactivées
            tant que le verrouillage est actif.
          </p>
        </section>
      )}

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
            <strong>Rôle courant :</strong> {currentRole ?? "null"}
          </p>
          <p>
            <strong>Erreur rôle :</strong> {currentRoleError?.message ?? "aucune"}
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
              <strong>ID :</strong> {report.id}
            </p>

            <p>
              <strong>Statut :</strong>{" "}
              {getStatusBadge(
                report.workflow_status,
                workflowLabel,
                workflowBadgeColor
              )}
            </p>

            <p>
              <strong>Statut technique :</strong>{" "}
              <span className="text-xs opacity-60">
                {report.workflow_status ?? "—"}
              </span>
            </p>

            <p>
              <strong>Verrouillé :</strong>{" "}
              <span className={isLocked ? "text-red-300" : "text-green-300"}>
                {isLocked ? "Oui" : "Non"}
              </span>
            </p>

            <p>
              <strong>Dernière modification :</strong>{" "}
              {formatDate(report.workflow_last_changed_at)}
            </p>

            <p>
              <strong>Modifié par :</strong>{" "}
              {report.workflow_last_changed_by ?? "—"}
            </p>

            <p>
              <strong>Saisi par chauffeur :</strong>{" "}
              {report.saisi_par_chauffeur_id ?? "—"}
            </p>

            <p>
              <strong>Validation chauffeur :</strong>{" "}
              {formatDate(report.valide_chauffeur_at)}
            </p>
          </div>
        )}
      </section>

      <section className="mb-6 rounded-lg border border-white/20 p-4">
        <h2 className="mb-4 text-xl font-semibold">Résumé métier</h2>

        {reportError ? (
          <p className="text-red-300">
            Impossible d’afficher le résumé métier.
          </p>
        ) : !report ? (
          <p>Rapport introuvable</p>
        ) : (
          <div className="grid gap-3 text-sm md:grid-cols-2 md:text-base">
            <p>
              <strong>Société :</strong> {report.societe_id ?? "—"}
            </p>
            <p>
              <strong>Site :</strong> {report.site_id ?? "—"}
            </p>
            <p>
              <strong>Salarié :</strong> {report.salarie_id ?? "—"}
            </p>
            <p>
              <strong>Véhicule :</strong> {report.vehicule_id ?? "—"}
            </p>
            <p>
              <strong>Client :</strong> {report.client_id ?? "—"}
            </p>
            <p>
              <strong>Site client :</strong> {report.site_client_id ?? "—"}
            </p>
            <p>
              <strong>Date rapport :</strong> {formatDate(report.date_rapport)}
            </p>
          </div>
        )}
      </section>

      <section className="mb-6 rounded-lg border border-white/20 p-4">
        <h2 className="mb-4 text-xl font-semibold">
          Historique des transitions
        </h2>

        {workflowLogsError ? (
          <p className="text-red-300">
            Erreur chargement historique : {workflowLogsError.message}
          </p>
        ) : formattedWorkflowLogs.length === 0 ? (
          <p className="text-white/70">
            Aucun historique workflow pour ce rapport.
          </p>
        ) : (
          <div className="space-y-4">
            {formattedWorkflowLogs.map((log) => {
              const oldLabel =
                log.old_status_label ?? formatWorkflowLabel(log.old_status);
              const newLabel =
                log.new_status_label ?? formatWorkflowLabel(log.new_status);

              return (
                <div
                  key={log.id}
                  className="relative rounded-lg border border-white/10 bg-white/5 p-4"
                >
                  <div className="mb-3 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                    <div className="flex flex-wrap items-center gap-2">
                      {getStatusBadge(log.old_status, oldLabel, null)}
                      <span className="text-white/50">→</span>
                      {getStatusBadge(log.new_status, newLabel, null)}
                    </div>

                    <span className="text-xs text-white/50">
                      {formatDate(log.created_at)}
                    </span>
                  </div>

                  <div className="grid gap-2 text-sm text-white/80 md:grid-cols-2">
                    <p>
                      <strong>Rôle :</strong> {log.changed_role ?? "—"}
                    </p>

                    <p>
                      <strong>Commentaire :</strong>{" "}
                      {log.comment_text?.trim() ? log.comment_text : "—"}
                    </p>

                    <p className="md:col-span-2">
                      <strong>Metadata :</strong>{" "}
                      <span className="text-xs text-white/50">
                        {log.metadata ? JSON.stringify(log.metadata) : "—"}
                      </span>
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {report && (
        <section
          className={`rounded-lg border p-4 ${
            isLocked ? "border-red-400 bg-red-950/20" : "border-white/20"
          }`}
        >
          <h2 className="mb-4 text-xl font-semibold">Actions workflow</h2>

          {isLocked ? (
            <div className="rounded-md border border-red-400 bg-red-950/40 p-4 text-red-100">
              <p className="font-semibold">Actions désactivées</p>
              <p>
                Ce rapport est verrouillé. Aucune transition ne peut être
                exécutée tant que le verrouillage est actif.
              </p>
            </div>
          ) : (
            <TransitionForm
              reportId={report.id}
              currentStatus={report.workflow_status}
              isLocked={isLocked}
              currentRole={currentRole}
              allowedTransitions={allowedTransitions}
              initialState={initialTransitionState}
              action={runReportWorkflowTransition}
            />
          )}
        </section>
      )}
    </main>
  );
}

export default function ReportPage(props: PageProps) {
  return (
    <Suspense
      fallback={<div className="p-6 text-white">Chargement du rapport…</div>}
    >
      <ReportPageContent {...props} />
    </Suspense>
  );
}
