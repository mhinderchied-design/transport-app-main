"use client";

import { useState } from "react";

type Props = {
  reportId: number;
  currentStatus: string;
  currentRole: string;
  isLocked: boolean;
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
  currentRole,
  isLocked,
}: Props) {
  const [targetStatus, setTargetStatus] = useState("");
  const [comment, setComment] = useState("");
  const [result, setResult] = useState<any>(null);

  const availableStatuses =
    currentRole === "super_super_admin"
      ? ALL_STATUSES.filter((s) => s !== currentStatus)
      : []; // (tu complèteras plus tard)

  const handleTransition = async () => {
    const res = await fetch("/api/workflow/transition", {
      method: "POST",
      body: JSON.stringify({
        reportId,
        targetStatus,
        comment,
      }),
    });

    const data = await res.json();
    setResult(data);
  };

  return (
    <div className="space-y-4 mt-6 border rounded-lg p-4">
      <h3 className="text-lg font-semibold">Actions workflow</h3>

      {/* INFOS */}
      <div>
        <p className="text-sm opacity-70">
          Statut actuel : <strong>{currentStatus ?? "—"}</strong>
        </p>
        <p className="text-sm opacity-70">
          Rôle : <strong>{currentRole ?? "—"}</strong>
        </p>
      </div>

      {/* MESSAGE OVERRIDE */}
      {currentRole === "super_super_admin" && (
        <div className="rounded-md border border-yellow-500/50 bg-yellow-500/10 p-3 text-sm text-yellow-200">
          Mode override super_super_admin actif : tous les statuts sont proposés,
          sauf le statut courant.
        </div>
      )}

      {/* SI VERROUILLÉ */}
      {isLocked ? (
        <div className="rounded-md border border-red-500/50 bg-red-500/10 p-3 text-sm text-red-200">
          🔒 Rapport verrouillé — aucune transition possible
        </div>
      ) : (
        <>
          {/* SELECT */}
          <div>
            <label className="text-sm block mb-1">Statut cible</label>
            <select
              value={targetStatus}
              onChange={(e) => setTargetStatus(e.target.value)}
              className="w-full border rounded-md p-2 bg-black"
            >
              <option value="">Choisir un statut</option>
              {availableStatuses.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>
          </div>

          {/* COMMENTAIRE */}
          <div>
            <label className="text-sm block mb-1">Commentaire</label>
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              className="w-full border rounded-md p-2 bg-black"
              placeholder="Commentaire de transition"
            />
          </div>

          {/* BUTTON */}
          <button
            onClick={handleTransition}
            className="px-4 py-2 bg-blue-600 rounded-md text-white"
          >
            Exécuter la transition
          </button>
        </>
      )}

      {/* RESULT */}
      {result && (
        <pre className="text-xs bg-black p-3 rounded-md border">
          {JSON.stringify(result, null, 2)}
        </pre>
      )}
    </div>
  );
}
