import { Suspense } from "react";
import { connection } from "next/server";
import { createClient } from "@/lib/supabase/server";

type PageProps = {
  params: Promise<{ id: string }>;
};

async function ReportContent({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await connection();

  const { id } = await params;
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("v_report_workflow_overview_with_badges")
    .select("*")
    .eq("rapport_id", Number(id))
    .single();

  if (error || !data) {
    return <div style={{ padding: "20px" }}>Erreur chargement rapport</div>;
  }

  return (
    <div style={{ padding: "20px", fontFamily: "Arial" }}>
      {/* 🔹 Titre */}
      <h1>Rapport #{data.rapport_id}</h1>

      {/* 🔹 Badge statut */}
      <div style={{ marginTop: "10px" }}>
        <span
          style={{
            backgroundColor: data.workflow_status_badge_color || "#6b7280",
            color: "white",
            padding: "6px 10px",
            borderRadius: "6px",
            fontSize: "12px",
            fontWeight: "bold",
          }}
        >
          {data.workflow_status_label}
        </span>
      </div>

      {/* 🔹 Bloc infos */}
      <div style={{ marginTop: "25px" }}>
        <h3>Informations workflow</h3>

        <p>
          <strong>Statut technique :</strong> {data.workflow_status}
        </p>

        <p>
          <strong>Verrouillé :</strong>{" "}
          {data.workflow_locked ? "Oui" : "Non"}
        </p>

        <p>
          <strong>Dernière modification :</strong>{" "}
          {data.workflow_last_changed_at}
        </p>
      </div>

      {/* 🔹 Placeholder futur (important pour la suite) */}
      <div style={{ marginTop: "40px", opacity: 0.6 }}>
        <h3>Zone future</h3>
        <p>→ transitions</p>
        <p>→ historique</p>
        <p>→ données métier</p>
      </div>
    </div>
  );
}

export default function ReportPage({ params }: PageProps) {
  return (
    <Suspense fallback={<div style={{ padding: "20px" }}>Chargement...</div>}>
      <ReportContent params={params} />
    </Suspense>
  );
}
