"use server";

import { createClient } from "@/lib/supabase/server";

export type ReportTransitionState = {
  transition_ok: boolean;
  old_status: string | null;
  new_status: string | null;
  transition_message: string;
};

export async function runReportWorkflowTransition(
  _prevState: ReportTransitionState,
  formData: FormData
): Promise<ReportTransitionState> {
  const reportIdRaw = formData.get("report_id");
  const toStatusRaw = formData.get("to_status");
  const commentaireRaw = formData.get("commentaire");

  const reportId = Number(reportIdRaw);
  const toStatus = String(toStatusRaw ?? "").trim();
  const commentaire = String(commentaireRaw ?? "").trim();

  if (!Number.isFinite(reportId)) {
    return {
      transition_ok: false,
      old_status: null,
      new_status: null,
      transition_message: "Identifiant rapport invalide",
    };
  }

  if (!toStatus) {
    return {
      transition_ok: false,
      old_status: null,
      new_status: null,
      transition_message: "Statut cible obligatoire",
    };
  }

  const supabase = await createClient();

  const { data, error } = await supabase.rpc(
    "app_transition_report_status_rpc",
    {
      p_rapport_id: reportId,
      p_to_status: toStatus,
      p_commentaire: commentaire || null,
    }
  );

  if (error) {
    return {
      transition_ok: false,
      old_status: null,
      new_status: null,
      transition_message: `Erreur RPC : ${error.message}`,
    };
  }

  const row = Array.isArray(data) ? data[0] : data;

  if (!row) {
    return {
      transition_ok: false,
      old_status: null,
      new_status: null,
      transition_message: "Aucune transition lancée pour le moment.",
    };
  }

  return {
    transition_ok: Boolean(row.transition_ok),
    old_status: row.old_status ?? null,
    new_status: row.new_status ?? null,
    transition_message: row.transition_message ?? "Résultat inconnu",
  };
}
