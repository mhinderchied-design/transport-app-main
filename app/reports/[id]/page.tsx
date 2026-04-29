import { Suspense } from "react";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { createClient } from "@/lib/supabase/server";
import LogoutButton from "./logout-button";
import {
  runReportWorkflowTransition,
  unlockReport,
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
  chauffeur_status: string | null;
  admin_status: string | null;
  admin_societe_status: string | null;
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
  "rejete",
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
    case "rejete":
      return "Rejeté";
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
    rejete: "border-red-500/50 bg-red-500/15 text-red-200",
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
    rejete: "bg-red-300 text-red-950",
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
    rejete: "✕",
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

function getTimelineDotClass(status: string | null) {
  const map: Record<string, string> = {
    brouillon: "bg-gray-300 ring-gray-400/30",
    saisi_chauffeur: "bg-blue-300 ring-blue-400/30",
    en_controle_admin: "bg-yellow-300 ring-yellow-400/30",
    rejete: "bg-red-300 ring-red-400/30",
    valide_admin: "bg-green-300 ring-green-400/30",
    en_attente_prefacturation: "bg-orange-300 ring-orange-400/30",
    prefacture: "bg-purple-300 ring-purple-400/30",
    valide_super_admin: "bg-emerald-300 ring-emerald-400/30",
    verrouille: "bg-red-300 ring-red-400/30",
  };

  return map[status ?? ""] ?? "bg-white ring-white/20";
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

  async function unlockReportAction(formData: FormData) {
    "use server";

    await unlockReport(formData);
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
        chauffeur_status,
        admin_status,
        admin_societe_status,
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
  const { data: transitionsData } = await supabase
    .from("app_report_workflow_transitions")
    .select("to_status")
    .eq("from_status", report.workflow_status)
    .eq("allowed_role", currentRole)
    .eq("is_active", true)
    .returns<TransitionRow[]>();

  allowedTransitions = transitionsData?.map((t) => t.to_status) ?? [];
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
 const latestWorkflowReject = formattedWorkflowLogs.find((log) => {
  if (!report?.workflow_status) return false;

  const isCurrentReturn = log.new_status === report.workflow_status;

  const adminRejectedChauffeur =
    log.changed_role === "admin" &&
    log.old_status === "saisi_chauffeur" &&
    log.new_status === "brouillon";

  const adminSocieteRejectedAdmin =
    log.changed_role === "admin_societe" &&
    log.old_status === "valide_admin" &&
    log.new_status === "saisi_chauffeur";

  const superAdminRejectedAdminSociete =
    log.changed_role === "super_super_admin" &&
    log.old_status === "en_attente_prefacturation" &&
    log.new_status === "valide_admin";

  return (
    isCurrentReturn &&
    (adminRejectedChauffeur ||
      adminSocieteRejectedAdmin ||
      superAdminRejectedAdminSociete)
  );
});

const latestWorkflowValidation = !latestWorkflowReject
  ? formattedWorkflowLogs.find((log) => {
  const adminValidatedChauffeur =
    log.changed_role === "admin" &&
    log.old_status === "saisi_chauffeur" &&
    log.new_status === "valide_admin";

  const adminSocieteValidatedAdmin =
    log.changed_role === "admin_societe" &&
    log.old_status === "valide_admin" &&
    log.new_status === "en_attente_prefacturation";

  const superAdminValidatedAdminSociete =
    log.changed_role === "super_super_admin" &&
    log.old_status === "en_attente_prefacturation" &&
    log.new_status === "valide_super_admin";

  return (
    adminValidatedChauffeur ||
    adminSocieteValidatedAdmin ||
    superAdminValidatedAdminSociete
  );
})
  : null;

function getRejectAuthorLabel(role: string | null) {
  switch (role) {
    case "admin":
      return "le chef d’équipe";
    case "admin_societe":
      return "Elias";
    case "super_super_admin":
      return "Mickael";
    default:
      return "un responsable";
  }
}

function canSeeRejectNotice(
  currentRole: string | null,
  rejectRole: string | null
) {
  if (!currentRole || !rejectRole) return false;

  if (currentRole === "chauffeur") {
    return ["admin", "admin_societe", "super_super_admin"].includes(rejectRole);
  }

  if (currentRole === "admin") {
    return ["admin_societe", "super_super_admin"].includes(rejectRole);
  }

  if (currentRole === "admin_societe") {
    return rejectRole === "super_super_admin";
  }

  return false;
}

function getValidationAuthorLabel(role: string | null) {
  switch (role) {
    case "admin":
      return "le chef d’équipe";
    case "admin_societe":
      return "Elias";
    case "super_super_admin":
      return "Mickael";
    default:
      return "un responsable";
  }
}

function canSeeValidationNotice(
  currentRole: string | null,
  validationRole: string | null
) {
  if (!currentRole || !validationRole) return false;

  if (currentRole === "chauffeur") {
    return ["admin", "admin_societe", "super_super_admin"].includes(
      validationRole
    );
  }

  if (currentRole === "admin") {
    return ["admin_societe", "super_super_admin"].includes(validationRole);
  }

  if (currentRole === "admin_societe") {
    return validationRole === "super_super_admin";
  }

  return false;
}
  return (
    <main className="mx-auto max-w-5xl p-6 text-white">
      <div className="mb-6 flex items-center justify-between gap-4">
  <h1 className="text-3xl font-bold">Rapport journalier #{reportId}</h1>
  <LogoutButton />
</div>

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
  <strong>Statut chauffeur :</strong>{" "}
  {report.chauffeur_status ?? "—"}
</p>

<p>
  <strong>Statut admin :</strong>{" "}
  {report.admin_status ?? "—"}
</p>

<p>
  <strong>Statut admin société :</strong>{" "}
  {report.admin_societe_status ?? "—"}
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
      {report &&
      latestWorkflowReject &&
canSeeRejectNotice(currentRole, latestWorkflowReject.changed_role) &&
(
  (currentRole === "chauffeur" && report.chauffeur_status === "refuse") ||
  (currentRole === "admin" && report.admin_status === "refuse") ||
  (currentRole === "admin_societe" && report.admin_societe_status === "refuse")
) && (
    <section className="mb-6 rounded-lg border border-red-400 bg-red-950/30 p-4 text-red-100">
      <details>
        <summary className="cursor-pointer list-none">
          <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-lg font-semibold">
                Journée rejetée par{" "}
                {getRejectAuthorLabel(latestWorkflowReject.changed_role)}
              </h2>

              <p className="mt-1 text-sm text-red-100/70">
                Cliquer pour voir le motif du rejet.
              </p>
            </div>

            <span className="w-fit rounded-full border border-red-300/40 bg-red-500/20 px-3 py-1 text-xs text-red-100">
              Rejet
            </span>
          </div>
        </summary>

        <div className="mt-4 rounded-lg border border-red-300/20 bg-black/20 p-4 text-sm">
          <p>
            <strong>Statut concerné :</strong>{" "}
            {formatWorkflowLabel(latestWorkflowReject.old_status)} →{" "}
            {formatWorkflowLabel(latestWorkflowReject.new_status)}
          </p>

          <p className="mt-2">
            <strong>Rejeté par :</strong>{" "}
            {getRejectAuthorLabel(latestWorkflowReject.changed_role)}
          </p>

          <p className="mt-2">
            <strong>Date :</strong>{" "}
            {formatDate(latestWorkflowReject.created_at)}
          </p>

          <p className="mt-2">
            <strong>Motif :</strong>{" "}
            {latestWorkflowReject.comment_text?.trim()
              ? latestWorkflowReject.comment_text
              : "Aucun commentaire renseigné."}
          </p>
        </div>
      </details>
    </section>
  )}
      {latestWorkflowValidation &&
  canSeeValidationNotice(
    currentRole,
    latestWorkflowValidation.changed_role
  ) && (
    <section className="mb-6 rounded-lg border border-green-400 bg-green-950/30 p-4 text-green-100">
      <details>
        <summary className="cursor-pointer list-none">
          <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-lg font-semibold">
                Journée validée par{" "}
                {getValidationAuthorLabel(
                  latestWorkflowValidation.changed_role
                )}
              </h2>

              <p className="mt-1 text-sm text-green-100/70">
                Cliquer pour voir le détail de la validation.
              </p>
            </div>

            <span className="w-fit rounded-full border border-green-300/40 bg-green-500/20 px-3 py-1 text-xs text-green-100">
              Validation
            </span>
          </div>
        </summary>

        <div className="mt-4 rounded-lg border border-green-300/20 bg-black/20 p-4 text-sm">
          <p>
            <strong>Statut concerné :</strong>{" "}
            {formatWorkflowLabel(latestWorkflowValidation.old_status)} →{" "}
            {formatWorkflowLabel(latestWorkflowValidation.new_status)}
          </p>

          <p className="mt-2">
            <strong>Validée par :</strong>{" "}
            {getValidationAuthorLabel(
              latestWorkflowValidation.changed_role
            )}
          </p>

          <p className="mt-2">
            <strong>Date :</strong>{" "}
            {formatDate(latestWorkflowValidation.created_at)}
          </p>

          <p className="mt-2">
            <strong>Commentaire :</strong>{" "}
            {latestWorkflowValidation.comment_text?.trim()
              ? latestWorkflowValidation.comment_text
              : "Aucun commentaire renseigné."}
          </p>
        </div>
      </details>
    </section>
  )}

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

      <section className="mb-6 rounded-xl border border-white/20 bg-white/[0.02] p-4 shadow-sm">
        <details>
          <summary className="cursor-pointer list-none">
            <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
              <div>
                <h2 className="text-xl font-semibold">
                  Historique des transitions
                </h2>
                <p className="mt-1 text-sm text-white/50">
                  Cliquer pour ouvrir ou fermer la traçabilité complète du rapport.
                </p>
              </div>

              <span className="w-fit rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-white/60">
                {formattedWorkflowLogs.length} événement
                {formattedWorkflowLogs.length > 1 ? "s" : ""}
              </span>
            </div>
          </summary>

          <div className="mt-5">
            {workflowLogsError ? (
              <p className="rounded-lg border border-red-400/40 bg-red-950/30 p-3 text-sm text-red-200">
                Erreur chargement historique : {workflowLogsError.message}
              </p>
            ) : formattedWorkflowLogs.length === 0 ? (
              <p className="rounded-lg border border-white/10 bg-white/5 p-3 text-sm text-white/60">
                Aucun historique workflow pour ce rapport.
              </p>
            ) : (
              <div className="relative pl-7">
                <div className="absolute bottom-3 left-[9px] top-3 w-px bg-gradient-to-b from-white/5 via-white/20 to-white/5" />

                {formattedWorkflowLogs.map((log) => {
                  const oldLabel =
                    log.old_status_label ??
                    formatWorkflowLabel(log.old_status);
                  const newLabel =
                    log.new_status_label ??
                    formatWorkflowLabel(log.new_status);

                  return (
                    <div key={log.id} className="group relative mb-5 last:mb-0">
                      <div
                        className={`absolute left-[-25px] top-5 h-4 w-4 rounded-full ring-4 transition-all duration-200 group-hover:scale-125 ${getTimelineDotClass(
                          log.new_status
                        )}`}
                      />

                      <div className="rounded-xl border border-white/10 bg-white/[0.04] p-4 shadow-sm transition-all duration-200 ease-out group-hover:-translate-y-0.5 group-hover:border-white/25 group-hover:bg-white/[0.07] group-hover:shadow-md">
                        <div className="mb-3 flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                          <div className="flex flex-wrap items-center gap-2">
                            {getStatusBadge(log.old_status, oldLabel, null)}
                            <span className="text-sm text-white/35">→</span>
                            {getStatusBadge(log.new_status, newLabel, null)}
                          </div>

                          <span className="shrink-0 rounded-full border border-white/10 bg-black/20 px-2.5 py-1 text-xs text-white/50">
                            {formatDate(log.created_at)}
                          </span>
                        </div>

                        <div className="grid gap-3 text-sm md:grid-cols-2">
                          <div className="rounded-lg border border-white/5 bg-black/10 p-3">
                            <p className="mb-1 text-xs uppercase tracking-wide text-white/35">
                              Rôle
                            </p>
                            <p className="font-medium text-white/85">
                              {log.changed_role ?? "—"}
                            </p>
                          </div>

                          <div className="rounded-lg border border-white/5 bg-black/10 p-3">
                            <p className="mb-1 text-xs uppercase tracking-wide text-white/35">
                              Commentaire
                            </p>
                            <p className="font-medium text-white/85">
                              {log.comment_text?.trim()
                                ? log.comment_text
                                : "—"}
                            </p>
                          </div>

                          {log.metadata &&
                            Object.keys(log.metadata).length > 0 && (
                              <div className="rounded-lg border border-white/5 bg-black/10 p-3 md:col-span-2">
                                <p className="mb-1 text-xs uppercase tracking-wide text-white/35">
                                  Metadata
                                </p>
                                <p className="font-mono text-xs text-white/60">
                                  {JSON.stringify(log.metadata)}
                                </p>
                              </div>
                            )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </details>
      </section>

      {report && (
        <section
          className={`rounded-lg border p-4 ${
            isLocked ? "border-red-400 bg-red-950/20" : "border-white/20"
          }`}
        >
          <h2 className="mb-4 text-xl font-semibold">Actions workflow</h2>

          {isLocked ? (
            <div className="space-y-4">
              <div className="rounded-md border border-red-400 bg-red-950/40 p-4 text-red-100">
                <p className="font-semibold">Actions désactivées</p>
                <p>
                  Ce rapport est verrouillé. Aucune transition ne peut être
                  exécutée tant que le verrouillage est actif.
                </p>
              </div>

              {currentRole === "super_super_admin" && (
                <form
                  action={unlockReportAction}
                  className="rounded-lg border border-yellow-400/50 bg-yellow-950/30 p-4"
                >
                  <input type="hidden" name="reportId" value={report.id} />

                  <label className="mb-2 block text-sm font-semibold text-yellow-100">
                    Commentaire de déverrouillage
                  </label>

                  <textarea
                    name="comment"
                    className="mb-3 min-h-24 w-full rounded-md border border-yellow-400/40 bg-black/30 p-3 text-sm text-white outline-none"
                    placeholder="Exemple : correction administrative super admin"
                  />

                  <button
                    type="submit"
                    className="rounded-md border border-yellow-300 bg-yellow-500/20 px-4 py-2 text-sm font-semibold text-yellow-100 transition hover:bg-yellow-500/30"
                  >
                    Déverrouiller le rapport
                  </button>
                </form>
              )}
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
