import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";

type PageProps = {
  params: Promise<{ id: string }>;
};

async function ReportContent({ id }: { id: string }) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("v_report_workflow_overview_with_badges")
    .select("*")
    .eq("rapport_id", Number(id))
    .single();

  if (error || !data) {
    return <div>Erreur chargement rapport</div>;
  }

  return (
    <div style={{ padding: "20px" }}>
      <h1>Rapport #{data.rapport_id}</h1>

      <div style={{ marginTop: "20px" }}>
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

      <div style={{ marginTop: "20px" }}>
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
    </div>
  );
}

export default async function ReportPage({ params }: PageProps) {
  const { id } = await params;

  return (
    <Suspense fallback={<div style={{ padding: "20px" }}>Chargement du rapport...</div>}>
      <ReportContent id={id} />
    </Suspense>
  );
}
