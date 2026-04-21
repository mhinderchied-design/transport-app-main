import { Suspense } from "react";
import { connection } from "next/server";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { runWorkflowTransition, type TransitionState } from "./actions";
import { useActionState } from "react";

type PageProps = {
  params: Promise<{
    id: string;
  }>;
};

const initialTransitionState: TransitionState = {
  ok: false,
  message: "",
  old_status: null,
  new_status: null,
  transition_ok: false,
  transition_message: null,
};

function TransitionForm({
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
            <option value="en_attente_prefacturation">en_attente_prefacturation</option>
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
          <strong>transition_ok :</strong>{" "}
          {String(state.transition_ok ?? false)}
        </p>
        <p>
          <strong>old_status :</strong>{" "}
          {state.old_status ?? "null"}
        </p>
        <p>
          <strong>new_status :</strong>{" "}
          {state.new_status ?? "null"}
        </p>
      </div>
    </section>
  );
}

async function WorkflowReportPageContent({ params }: PageProps) {
  await connection();

  const { id } = await params;
  const reportId = Number(id);

  if (!Number.isInteger(reportId) || reportId <= 0) {
    notFound();
  }

  const supabase = await createClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  const { data: roleData, error: roleError } =
    await supabase.rpc("app_get_current_role");

  const { data: report, error: reportError } = await supabase
    .from("rapports_journaliers")
    .select(`
      id,
      workflow_status,
      workflow_locked,
      workflow_last_changed_at,
      workflow_last_changed_by,
      saisi_par_chauffeur_id,
      valide_chauffeur_at
    `)
    .eq("id", reportId)
    .maybeSingle();

  return (
    <main className="mx-auto max-w-4xl p-6 space-y-6">
      <h1 className="text-2xl font-bold">
        Fiche de test métier — Workflow rapport
      </h1>

      <section className="border p-4 rounded space-y-2">
        <h2 className="font-semibold">Contexte utilisateur</h2>

        <p>
          <strong>User ID :</strong> {user?.id ?? "NON CONNECTÉ"}
        </p>

        <p>
          <strong>Email :</strong> {user?.email ?? "—"}
        </p>

        <p>
          <strong>Erreur session :</strong> {userError?.message ?? "aucune"}
        </p>

        <p>
          <strong>Rôle courant :</strong> {roleData ?? "null"}
        </p>

        <p>
          <strong>Erreur rôle :</strong> {roleError?.message ?? "aucune"}
        </p>
      </section>

      <section className="border p-4 rounded space-y-2">
        <h2 className="font-semibold">Rapport</h2>

        {reportError && (
          <p className="text-red-600">
            Erreur rapport : {reportError.message}
          </p>
        )}

        {!report && <p>Rapport introuvable</p>}

        {report && (
          <>
            <p>
              <strong>ID :</strong> {report.id}
            </p>

            <p>
              <strong>Status :</strong> {report.workflow_status ?? "null"}
            </p>

            <p>
              <strong>Locked :</strong> {String(report.workflow_locked)}
            </p>

            <p>
              <strong>Last changed at :</strong>{" "}
              {report.workflow_last_changed_at ?? "null"}
            </p>

            <p>
              <strong>Last changed by :</strong>{" "}
              {report.workflow_last_changed_by ?? "null"}
            </p>

            <p>
              <strong>saisi_par_chauffeur_id :</strong>{" "}
              {report.saisi_par_chauffeur_id ?? "null"}
            </p>

            <p>
              <strong>valide_chauffeur_at :</strong>{" "}
              {report.valide_chauffeur_at ?? "null"}
            </p>
          </>
        )}
      </section>

      {report && <TransitionForm reportId={report.id} />}
    </main>
  );
}

export default function Page(props: PageProps) {
  return (
    <Suspense fallback={<div>Chargement...</div>}>
      <WorkflowReportPageContent {...props} />
    </Suspense>
  );
}
