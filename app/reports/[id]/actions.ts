"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type ReportTransitionState = {
  transition_ok: boolean;
  old_status: string | null;
  new_status: string | null;
  transition_message: string;
};

export type ReportUnlockState = {
  success: boolean;
  message: string;
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

type ApplyWorkflowTransitionResult = {
  success?: boolean;
  old_status?: string | null;
  new_status?: string | null;
  message?: string | null;
};

type UnlockReportResult = {
  success?: boolean;
  message?: string | null;
  already_unlocked?: boolean;
};

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

  if (!ALL_WORKFLOW_STATUSES.includes(targetStatus)) {
    return {
      transition_ok: false,
      old_status: null,
      new_status: null,
      transition_message: "Statut cible inconnu.",
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
      transition_message: reportError?.message ?? "Rapport introuvable.",
    };
  }

  if (report.workflow_locked) {
    return {
      transition_ok: false,
      old_status: report.workflow_status,
      new_status: report.workflow_status,
      transition_message: "Rapport verrouillé : transition impossible.",
    };
  }

  if (report.workflow_status === targetStatus) {
    return {
      transition_ok: false,
      old_status: report.workflow_status,
      new_status: report.workflow_status,
      transition_message: "Le statut cible est identique au statut actuel.",
    };
  }

  const { data, error } = await supabase.rpc("app_apply_workflow_transition", {
    p_rapport_id: reportId,
    p_to_status: targetStatus,
    p_comment: comment,
  });

  if (error) {
    return {
      transition_ok: false,
      old_status: report.workflow_status,
      new_status: report.workflow_status,
      transition_message: `Erreur transition sécurisée : ${error.message}`,
    };
  }

  const result = data as ApplyWorkflowTransitionResult | null;

  const transitionOk = Boolean(result?.success);
  const oldStatus = result?.old_status ?? report.workflow_status;
  const newStatus = result?.new_status ?? oldStatus;

  if (transitionOk) {
    revalidatePath(`/reports/${reportId}`);
  }

  return {
    transition_ok: transitionOk,
    old_status: oldStatus,
    new_status: newStatus,
    transition_message:
      result?.message ??
      (transitionOk ? "Transition effectuée." : "Transition refusée."),
  };
}

export async function unlockReport(
  formData: FormData
): Promise<ReportUnlockState> {
  const supabase = await createClient();

  const reportIdValue = getFormValue(formData, [
    "reportId",
    "report_id",
    "rapportId",
    "rapport_id",
  ]);

  const comment =
    getFormValue(formData, ["comment", "unlock_comment"]) ??
    "Déverrouillage manuel par super_super_admin";

  const reportId = Number(reportIdValue);

  if (!Number.isFinite(reportId)) {
    return {
      success: false,
      message: "ID rapport invalide.",
    };
  }

  const { data: currentRoleData, error: roleError } = await supabase.rpc(
    "app_get_current_role"
  );

  const currentRole = currentRoleData ? String(currentRoleData) : null;

  if (roleError || currentRole !== "super_super_admin") {
    return {
      success: false,
      message: "Déverrouillage non autorisé.",
    };
  }

  const { data, error } = await supabase.rpc("app_unlock_report", {
    p_report_id: reportId,
    p_comment: comment,
  });

  if (error) {
    return {
      success: false,
      message: `Erreur déverrouillage : ${error.message}`,
    };
  }

  const result = data as UnlockReportResult | null;

  const success = Boolean(result?.success);

  if (success) {
    revalidatePath(`/reports/${reportId}`);
  }

  return {
    success,
    message:
      result?.message ??
      (success ? "Rapport déverrouillé." : "Déverrouillage refusé."),
  };
}
