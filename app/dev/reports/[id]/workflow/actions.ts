"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type WorkflowTransitionState = {
  ok: boolean;
  message: string;
  old_status?: string | null;
  new_status?: string | null;
  transition_ok?: boolean;
  transition_message?: string | null;
};

export async function runWorkflowTransition(
  _prevState: WorkflowTransitionState,
  formData: FormData
): Promise<WorkflowTransitionState> {
  const reportIdRaw = formData.get("reportId");
  const targetStatusRaw = formData.get("targetStatus");
  const commentRaw = formData.get("comment");

  const reportId = Number(reportIdRaw);
  const targetStatus = String(targetStatusRaw ?? "").trim();
  const comment = String(commentRaw ?? "").trim();

  if (!Number.isInteger(reportId) || reportId <= 0) {
    return {
      ok: false,
      message: "ID de rapport invalide.",
    };
  }

  if (!targetStatus) {
    return {
      ok: false,
      message: "Statut cible obligatoire.",
    };
  }

  const supabase = await createClient();

  const { data, error } = await supabase.rpc("app_transition_report_status", {
    p_rapport_id: reportId,
    p_to_status: targetStatus,
    p_commentaire: comment || null,
  });

  if (error) {
    return {
      ok: false,
      message: `Erreur RPC : ${error.message}`,
    };
  }

  const row = Array.isArray(data) ? data[0] : data;

  revalidatePath(`/dev/reports/${reportId}/workflow`);

  return {
    ok: Boolean(row?.transition_ok),
    message: row?.transition_message ?? "Réponse reçue.",
    old_status: row?.old_status ?? null,
    new_status: row?.new_status ?? null,
    transition_ok: row?.transition_ok ?? false,
    transition_message: row?.transition_message ?? null,
  };
}
