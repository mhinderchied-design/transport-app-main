import { supabase } from "@/lib/supabase";

export type DailyReportDocumentType =
  | "chronopost_c11"
  | "colis_prive_scan"
  | "vehicle_damage"
  | "package_anomaly"
  | "delivery_proof"
  | "other";

type UploadDailyReportDocumentParams = {
  reportId: string;
  file: File;
  documentType: DailyReportDocumentType;
  isRequired?: boolean;
};

export async function uploadDailyReportDocument({
  reportId,
  file,
  documentType,
  isRequired = false,
}: UploadDailyReportDocumentParams) {
  if (!reportId) {
    throw new Error("Rapport manquant.");
  }

  if (!file) {
    throw new Error("Fichier manquant.");
  }

  const allowedTypes = [
    "image/jpeg",
    "image/png",
    "image/webp",
    "application/pdf",
  ];

  if (!allowedTypes.includes(file.type)) {
    throw new Error("Type de fichier non autorisé.");
  }

  const maxSize = 10 * 1024 * 1024;

  if (file.size > maxSize) {
    throw new Error("Le fichier dépasse la limite de 10 Mo.");
  }

  const fileExt = file.name.split(".").pop();
  const fileName = `${crypto.randomUUID()}.${fileExt}`;
  const storagePath = `${reportId}/${documentType}/${fileName}`;

  const { error: uploadError } = await supabase.storage
    .from("daily-report-documents")
    .upload(storagePath, file, {
      cacheControl: "3600",
      upsert: false,
      contentType: file.type,
    });

  if (uploadError) {
    throw uploadError;
  }

  const { data, error: rpcError } = await supabase.rpc(
    "add_daily_report_document",
    {
      p_daily_report_id: reportId,
      p_document_type: documentType,
      p_file_name: file.name,
      p_file_mime_type: file.type,
      p_storage_path: storagePath,
      p_is_required: isRequired,
    }
  );

  if (rpcError) {
    throw rpcError;
  }

  return data;
}
