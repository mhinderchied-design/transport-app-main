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
      return status ?? "—";
  }
}

function getTransitionLabel(
  status: string,
  currentStatus: string | null,
  currentRole: string | null
) {
  if (currentStatus === "brouillon") {
    if (status === "saisi_chauffeur") {
      return "Valider la journée chauffeur";
    }

    if (status === "valide_admin") {
      return "Valider chauffeur + admin";
    }

    if (status === "en_attente_prefacturation") {
      return "Valider chauffeur + admin + admin société";
    }

    if (status === "valide_super_admin") {
      return "Valider définitivement";
    }
  }

  if (currentStatus === "saisi_chauffeur") {
    if (status === "brouillon") {
      return "Renvoyer au chauffeur";
    }

    if (status === "valide_admin") {
      return "Valider la journée";
    }

    if (status === "en_attente_prefacturation") {
      return "Valider admin + admin société";
    }

    if (status === "valide_super_admin") {
      return "Valider définitivement";
    }
  }

  if (currentStatus === "valide_admin") {
    if (status === "brouillon") {
      return "Renvoyer au chauffeur";
    }

    if (status === "saisi_chauffeur") {
      return "Renvoyer à l’admin";
    }

    if (status === "en_attente_prefacturation") {
      return "Valider la journée";
    }

    if (status === "valide_super_admin") {
      return "Valider définitivement";
    }
  }

  if (currentStatus === "en_attente_prefacturation") {
    if (status === "brouillon") {
      return "Renvoyer au chauffeur";
    }

    if (status === "saisi_chauffeur") {
      return "Renvoyer à l’admin";
    }

    if (status === "valide_admin") {
      return "Renvoyer à l’admin société";
    }

    if (status === "valide_super_admin") {
      return "Valider définitivement";
    }
  }

  if (status === "brouillon") {
    return "Renvoyer au chauffeur";
  }

  if (status === "saisi_chauffeur") {
    return "Renvoyer à l’admin";
  }

  if (status === "valide_admin") {
    return "Renvoyer à l’admin société";
  }

  if (status === "en_attente_prefacturation") {
    return "Valider la journée";
  }

  if (status === "valide_super_admin") {
    return "Valider définitivement";
  }

  return formatWorkflowLabel(status);
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
  const [state, formAction] = useFormState(action, initialState);

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
          Situation actuelle :{" "}
          <strong>{formatWorkflowLabel(currentStatus)}</strong>
        </p>
        <p className="text-sm opacity-70">
          Rôle : <strong>{currentRole ?? "—"}</strong>
        </p>
      </div>

      {currentRole === "super_super_admin" && (
        <div className="rounded-md border border-yellow-500/50 bg-yellow-500/10 p-3 text-sm text-yellow-200">
          Mode super admin : accès complet (peut se substituer à tous les rôles)
        </div>
      )}

      <div>
        <label className="mb-1 block text-sm">Action à effectuer</label>
        <select
          name="to_status"
          className="w-full rounded border border-white/20 bg-black/30 p-2"
          required
        >
          <option value="">Choisir un statut</option>
         {allowedTransitions.map((status) => (
  <option key={status} value={status}>
    {getTransitionLabel(status, currentStatus, currentRole)}
  </option>
))}
        </select>
      </div>

      <div>
        <label className="mb-1 block text-sm">Commentaire</label>
        <textarea
          name="comment"
          placeholder="Commentaire de transition"
          className="w-full rounded border border-white/20 bg-black/30 p-2"
        />
      </div>

      <button
        type="submit"
        className="rounded bg-white/10 px-4 py-2 hover:bg-white/20"
      >
       Valider l’action
      </button>

      {state.transition_message && (
  <div
    className={`mt-4 rounded-md border p-3 text-sm ${
      state.transition_ok
        ? "border-green-500/40 bg-green-950/30 text-green-100"
        : "border-red-500/40 bg-red-950/30 text-red-100"
    }`}
  >
    {state.transition_message}
  </div>
)}
    </form>
  );
}
