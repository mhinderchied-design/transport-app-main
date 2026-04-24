"use client";

import { useFormState } from "react-dom";
import type { ReportTransitionState } from "./actions";

type Props = {
  reportId: number;
  currentStatus: string | null;
  isLocked: boolean;
  currentRole: string | null;
  allowedTransitions: string[];
  initialState: ReportTransitionState;
  action: (
    prevState: ReportTransitionState,
    formData: FormData
  ) => Promise<ReportTransitionState>;
};

export default function TransitionForm({
  reportId,
  currentStatus,
  isLocked,
  currentRole,
  allowedTransitions,
  initialState,
  action,
}: Props) {
  const [state, formAction] = useFormState(action, initialState);

  // 🔒 CAS VERROUILLÉ → on bloque tout
  if (isLocked) {
    return (
      <div className="rounded-lg border border-red-500/40 bg-red-500/10 p-4 text-red-200">
        <p className="font-semibold">🔒 Rapport verrouillé</p>
        <p className="text-sm opacity-80">
          Aucune modification possible sur ce rapport.
        </p>
      </div>
    );
  }

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="report_id" value={reportId} />

      <div>
        <p className="text-sm opacity-70">
          Statut actuel : <strong>{currentStatus ?? "—"}</strong>
        </p>
        <p className="text-sm opacity-70">
          Rôle : <strong>{currentRole ?? "—"}</strong>
        </p>
      </div>

      <div>
        <label className="block text-sm mb-1">Statut cible</label>
        <select
          name="to_status"
          className="w-full rounded bg-black/30 border border-white/20 p-2"
          required
        >
          <option value="">Choisir un statut</option>
          {allowedTransitions.map((status) => (
            <option key={status} value={status}>
              {status}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-sm mb-1">Commentaire</label>
        <textarea
          name="comment"
          placeholder="Commentaire de transition"
          className="w-full rounded bg-black/30 border border-white/20 p-2"
        />
      </div>

      <button
        type="submit"
        className="rounded bg-white/10 px-4 py-2 hover:bg-white/20"
      >
        Exécuter la transition
      </button>

      <div className="mt-4 text-sm opacity-80">
        <p>Résultat : {state.transition_message}</p>
        <p>transition_ok : {String(state.transition_ok)}</p>
        <p>old_status : {state.old_status ?? "null"}</p>
        <p>new_status : {state.new_status ?? "null"}</p>
      </div>
    </form>
  );
}
