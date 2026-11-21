import { useEffect, useState } from 'react'
import { api, errorMessage } from '../../api/client'
import type { Transcript } from '../../api/types'
import { EmptyState, ErrorNotice, MiniStat, PageHeader } from '../../components/Field'
import { TranscriptView } from '../../components/TranscriptView'

export function MyGradesPage() {
  const [data, setData] = useState<Transcript | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    api<Transcript>('/my/grades')
      .then(setData)
      .catch((err) => setError(errorMessage(err)))
  }, [])

  return (
    <section>
      <PageHeader eyebrow="Academics" title="My grades" subtitle="Results appear once the Head of Department approves them." />
      <ErrorNotice error={error} />
      {data && (
        <>
          <div className="mini-stats">
            <MiniStat label="Cumulative GPA" value={data.cumulativeGpa?.toFixed(2) ?? '-'} />
            <MiniStat label="Credits earned" value={data.creditsEarned} tone="amber" />
            <MiniStat label="Terms with results" value={data.terms.length} tone="blue" />
          </div>
          {data.terms.length === 0 ? <EmptyState title="No approved results yet" /> : <TranscriptView transcript={data} />}
        </>
      )}
    </section>
  )
}
