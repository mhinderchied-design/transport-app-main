"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import type { ReportTransitionState } from "./actions";

type Props = {
  reportId: number;
  currentStatus: string | null;
  isLocked: boolean;
  currentRole: string | null;
  allowedTransitions: string[];
  initialState: ReportTransitionState;
  action: (
    state: ReportTransitionState,
    formData: FormData
  ) => Promise<ReportTransitionState>;
};

function formatWorkflowLabel(status: string) {
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
      return status;
  }
}

export default function TransitionForm({
  reportId,
  currentStatus,
  isLocked,
  currentRole,
  allowedTransitions,
  initialState,
  action,
}: Props) {
  const router = useRouter();

  const [state, formAction, pending] = useActionState(action, initialState);

  // 🔥 REFRESH AUTO APRÈS SUCCÈS
  useEffect(() => {
    if (state.transition_ok) {
      router.refresh();
    }
  }, [state.transition_ok, router]);

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="report_id" value={reportId} />

      <div className="text-sm text-white/80">
        <p>
          <strong>Statut actuel :</strong> {currentStatus ?? "—"}
        </p>
        <p>
          <strong>Verrouillage :</strong> {isLocked ? "Oui" : "Non"}
        </p>
        <p>
          <strong>Rôle :</strong> {currentRole ?? "null"}
        </p>
      </div>

      {currentRole === "super_super_admin" && (
        <div className="rounded border border-amber-400/40 bg-amber-400/10 p-3 text-sm text-amber-200">
          Mode override super_super_admin actif : tous les statuts sont proposés,
          sauf le statut courant.
        </div>
      )}

      <div>
        <label className="mb-1 block text-sm font-medium">Statut cible</label>
        <select
          name="to_status"
          defaultValue=""
          className="w-full rounded border border-white/20 bg-black/20 p-2 text-white"
          required
        >
          <option value="" disabled>
            Choisir un statut
          </option>

          {allowedTransitions.length === 0 ? (
            <option disabled>Aucune transition autorisée</option>
          ) : (
            allowedTransitions.map((status) => (
              <option key={status} value={status}>
                {formatWorkflowLabel(status)}
              </option>
            ))
          )}
        </select>
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium">Commentaire</label>
        <textarea
          name="commentaire"
          placeholder="Commentaire de transition"
          className="min-h-28 w-full rounded border border-white/20 bg-black/20 p-2 text-white"
        />
      </div>

      <button
        type="submit"
        disabled={pending || allowedTransitions.length === 0}
        className="rounded border border-white/20 px-4 py-2 disabled:opacity-50"
      >
        {pending ? "Exécution..." : "Exécuter la transition"}
      </button>

      <div className="rounded border border-white/20 p-3 text-sm">
        <p>
          <strong>Résultat :</strong> {state.transition_message}
        </p>
        <p>
          <strong>transition_ok :</strong> {String(state.transition_ok)}
        </p>
        <p>
          <strong>old_status :</strong> {state.old_status ?? "null"}
        </p>
        <p>
          <strong>new_status :</strong> {state.new_status ?? "null"}
        </p>
      </div>
    </form>
  );
}
