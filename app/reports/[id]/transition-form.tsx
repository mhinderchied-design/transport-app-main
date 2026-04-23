"use client";

import { useActionState } from "react";
import type { ReportTransitionState } from "./actions";

type Props = {
  reportId: number;
  currentStatus: string | null;
  isLocked: boolean;
  initialState: ReportTransitionState;
  action: (
    state: ReportTransitionState,
    formData: FormData
  ) => Promise<ReportTransitionState>;
};

const ALL_STATUSES = [
  "brouillon",
  "saisi_chauffeur",
  "en_controle_admin",
  "valide_admin",
  "en_attente_prefacturation",
  "prefacture",
  "valide_super_admin",
  "verrouille",
];

export default function TransitionForm({
  reportId,
  currentStatus,
  isLocked,
  initialState,
  action,
}: Props) {
  const [state, formAction, pending] = useActionState(action, initialState);

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
      </div>

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
          {ALL_STATUSES.map((status) => (
            <option key={status} value={status}>
              {status}
            </option>
          ))}
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
        disabled={pending}
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
