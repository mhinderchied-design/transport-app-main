"use client";

import { useActionState } from "react";
import {
  runWorkflowTransition,
  type WorkflowTransitionState,
} from "./actions";

const initialTransitionState: WorkflowTransitionState = {
  ok: false,
  message: "",
  old_status: null,
  new_status: null,
  transition_ok: false,
  transition_message: null,
};

export default function TransitionForm({
  reportId,
}: {
  reportId: number;
}) {
  const [state, formAction, pending] = useActionState(
    runWorkflowTransition,
    initialTransitionState
  );

  return (
    <section className="border p-4 rounded space-y-4">
      <h2 className="font-semibold">Transition workflow</h2>

      <form action={formAction} className="space-y-4">
        <input type="hidden" name="reportId" value={reportId} />

        <div className="space-y-1">
          <label htmlFor="targetStatus" className="block font-medium">
            Statut cible
          </label>
          <select
            id="targetStatus"
            name="targetStatus"
            className="border rounded px-3 py-2 bg-transparent w-full"
            defaultValue="brouillon"
          >
            <option value="brouillon">brouillon</option>
            <option value="saisi_chauffeur">saisi_chauffeur</option>
            <option value="en_controle_admin">en_controle_admin</option>
            <option value="valide_admin">valide_admin</option>
            <option value="en_attente_prefacturation">
              en_attente_prefacturation
            </option>
            <option value="prefacture">prefacture</option>
            <option value="valide_super_admin">valide_super_admin</option>
            <option value="verrouille">verrouille</option>
          </select>
        </div>

        <div className="space-y-1">
          <label htmlFor="comment" className="block font-medium">
            Commentaire
          </label>
          <textarea
            id="comment"
            name="comment"
            className="border rounded px-3 py-2 bg-transparent w-full min-h-24"
            placeholder="Commentaire de transition"
          />
        </div>

        <button
          type="submit"
          disabled={pending}
          className="border rounded px-4 py-2"
        >
          {pending ? "Exécution..." : "Exécuter la transition"}
        </button>
      </form>

      <div className="border rounded p-3 space-y-1">
        <p>
          <strong>Résultat :</strong>{" "}
          {state.message || "Aucune transition lancée pour le moment."}
        </p>
        <p>
          <strong>transition_ok :</strong> {String(state.transition_ok ?? false)}
        </p>
        <p>
          <strong>old_status :</strong> {state.old_status ?? "null"}
        </p>
        <p>
          <strong>new_status :</strong> {state.new_status ?? "null"}
        </p>
      </div>
    </section>
  );
}
