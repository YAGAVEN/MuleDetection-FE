import InvestigationTable from '../components/InvestigationTable'
import PageTitle from '../components/PageTitle'

export default function CasesPage() {
  return (
    <section className="space-y-4">
      <PageTitle
        title="Investigation Cases"
        subtitle="Triage, filter, and escalate suspicious mule activity investigations."
      />
      <InvestigationTable />
    </section>
  )
}
