"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type ReportTransitionState = {
  transition_ok: boolean;
  old_status: string | null;
  new_status: string | null;
  transition_message: string;
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

function getFormValue(formData: FormData, keys: string[]) {
  for (const key of keys) {
    const value = formData.get(key);
    if (typeof value === "string" && value.trim() !== "") {
      return value.trim();
    }
  }

  return null;
}

export async function runReportWorkflowTransition(
  _previousState: ReportTransitionState,
  formData: FormData
): Promise<ReportTransitionState> {
  const supabase = await createClient();

  const reportIdValue = getFormValue(formData, [
    "reportId",
    "report_id",
    "rapportId",
    "rapport_id",
  ]);

  const targetStatus = getFormValue(formData, [
    "targetStatus",
    "target_status",
    "toStatus",
    "to_status",
    "workflow_status",
  ]);

  const comment = getFormValue(formData, ["comment", "transition_comment"]);

  const reportId = Number(reportIdValue);

  if (!Number.isFinite(reportId)) {
    return {
      transition_ok: false,
      old_status: null,
      new_status: null,
      transition_message: "ID rapport invalide.",
    };
  }

  if (!targetStatus) {
    return {
      transition_ok: false,
      old_status: null,
      new_status: null,
      transition_message: "Aucun statut cible sélectionné.",
    };
  }

  const { data: report, error: reportError } = await supabase
    .from("rapports_journaliers")
    .select(
      `
        id,
        workflow_status,
        workflow_locked
      `
    )
    .eq("id", reportId)
    .maybeSingle<{
      id: number;
      workflow_status: string | null;
      workflow_locked: boolean | null;
    }>();

  if (reportError || !report) {
    return {
      transition_ok: false,
      old_status: null,
      new_status: null,
      transition_message:
        reportError?.message ?? "Rapport introuvable.",
    };
  }

  // 🔒 VERROUILLAGE BACKEND
  // Si le rapport est verrouillé, aucune transition ne passe.
  if (report.workflow_locked) {
    return {
      transition_ok: false,
      old_status: report.workflow_status,
      new_status: report.workflow_status,
      transition_message: "Rapport verrouillé : transition impossible.",
    };
  }

  const oldStatus = report.workflow_status;

  if (oldStatus === targetStatus) {
    return {
      transition_ok: false,
      old_status: oldStatus,
      new_status: oldStatus,
      transition_message: "Le statut cible est identique au statut actuel.",
    };
  }

  const { data: currentRoleData, error: currentRoleError } = await supabase.rpc(
    "app_get_current_role"
  );

  if (currentRoleError) {
    return {
      transition_ok: false,
      old_status: oldStatus,
      new_status: oldStatus,
      transition_message: `Erreur récupération rôle : ${currentRoleError.message}`,
    };
  }

  const currentRole = currentRoleData ? String(currentRoleData) : null;

  if (!currentRole) {
    return {
      transition_ok: false,
      old_status: oldStatus,
      new_status: oldStatus,
      transition_message: "Aucun rôle courant trouvé.",
    };
  }

  let transitionAllowed = false;

  if (currentRole === "super_super_admin") {
    transitionAllowed =
      ALL_WORKFLOW_STATUSES.includes(targetStatus) && targetStatus !== oldStatus;
  } else {
    const { data: transitionData, error: transitionError } = await supabase
      .from("app_report_workflow_transitions")
      .select("to_status")
      .eq("from_status", oldStatus)
      .eq("to_status", targetStatus)
      .eq("allowed_role", currentRole)
      .eq("is_active", true)
      .maybeSingle<{ to_status: string }>();

    if (transitionError) {
      return {
        transition_ok: false,
        old_status: oldStatus,
        new_status: oldStatus,
        transition_message: `Erreur vérification transition : ${transitionError.message}`,
      };
    }

    transitionAllowed = Boolean(transitionData);
  }

  if (!transitionAllowed) {
    return {
      transition_ok: false,
      old_status: oldStatus,
      new_status: oldStatus,
      transition_message: "Transition non autorisée pour ce rôle.",
    };
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { error: updateError } = await supabase
    .from("rapports_journaliers")
    .update({
      workflow_status: targetStatus,
      workflow_last_changed_at: new Date().toISOString(),
      workflow_last_changed_by: user?.id ?? null,
    })
    .eq("id", reportId);

  if (updateError) {
    return {
      transition_ok: false,
      old_status: oldStatus,
      new_status: oldStatus,
      transition_message: `Erreur transition : ${updateError.message}`,
    };
  }

  revalidatePath(`/reports/${reportId}`);

  return {
    transition_ok: true,
    old_status: oldStatus,
    new_status: targetStatus,
    transition_message:
      currentRole === "super_super_admin"
        ? "transition effectuée (override super_super_admin)"
        : comment
          ? `transition effectuée : ${comment}`
          : "transition effectuée",
  };
}
