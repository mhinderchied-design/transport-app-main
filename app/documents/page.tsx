export const dynamic = 'force-dynamic'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export default async function DocumentsPage() {
  const { data: documents, error } = await supabase
    .from('documents_salaries')
    .select('*')
    .order('date_document', { ascending: false })

  if (error) {
    return <p>Erreur : {error.message}</p>
  }

  return (
    <main style={{ padding: 20 }}>
      <h1>Documents salariés</h1>

      {!documents || documents.length === 0 ? (
        <p>Aucun document</p>
      ) : (
        documents.map((doc) => (
          <div key={doc.id} style={{ marginBottom: 20 }}>
            <p><strong>{doc.type_document}</strong></p>
            <p>{doc.nom_fichier}</p>
            <p>{doc.date_document}</p>

            <a href={doc.url_fichier} target="_blank" rel="noreferrer">
              Voir le document
            </a>
          </div>
        ))
      )}
    </main>
  )
}
