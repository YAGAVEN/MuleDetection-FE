import DataIngestionPanel from '../components/DataIngestionPanel'
import PageTitle from '../components/PageTitle'

export default function IngestionPage() {
  return (
    <section className="space-y-4">
      <PageTitle
        title="Data Ingestion"
        subtitle="Upload datasets, validate streams, and monitor the AML feature pipeline."
      />
      <DataIngestionPanel />
    </section>
  )
}
