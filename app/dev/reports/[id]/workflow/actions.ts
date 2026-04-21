"use server";

import { createClient } from "@/lib/supabase/server";

export type TransitionState = {
  transition_ok: boolean;
  old_status: string | null;
  new_status: string | null;
  error?: string;
};

export async function runWorkflowTransition(
  prevState: TransitionState,
  formData: FormData
): Promise<TransitionState> {
  try {
    const supabase = await createClient();

    const reportId = Number(formData.get("report_id"));
    const targetStatus = String(formData.get("target_status"));
    const comment = formData.get("comment")?.toString() || null;

    const { data, error } = await supabase.rpc(
      "app_transition_report_status",
      {
        p_rapport_id: reportId,
        p_to_status: targetStatus,
        p_commentaire: comment,
      }
    );

    if (error) {
      return {
        transition_ok: false,
        old_status: null,
        new_status: null,
        error: `Erreur RPC : ${error.message}`,
      };
    }

    const result = data?.[0];

    return {
      transition_ok: result?.transition_ok ?? false,
      old_status: result?.old_status ?? null,
      new_status: result?.new_status ?? null,
    };
  } catch (e: any) {
    return {
      transition_ok: false,
      old_status: null,
      new_status: null,
      error: e.message,
    };
  }
}
