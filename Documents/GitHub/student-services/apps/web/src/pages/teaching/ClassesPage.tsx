import { ArrowRight, Users } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { api, errorMessage } from '../../api/client'
import type { Offering } from '../../api/types'
import { EmptyState, ErrorNotice, PageHeader, StateBadge } from '../../components/Field'

const VIEWS: Record<string, { title: string; subtitle: string }> = {
  attendance: { title: 'Attendance', subtitle: 'Pick a class to take or review attendance.' },
  grades: { title: 'Gradebook', subtitle: 'Pick a class to enter or review grades.' },
  materials: { title: 'Course materials', subtitle: 'Pick a class to share or manage materials.' },
}

export function ClassesPage() {
  const [params] = useSearchParams()
  const view = params.get('view') ?? ''
  const [classes, setClasses] = useState<Offering[]>([])
  const [error, setError] = useState<string | null>(null)
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    api<Offering[]>('/teaching/classes')
      .then(setClasses)
      .catch((err) => setError(errorMessage(err)))
      .finally(() => setLoaded(true))
  }, [])

  const current = classes.filter((c) => c.term.isCurrent)
  const past = classes.filter((c) => !c.term.isCurrent)

  return (
    <section>
      <PageHeader
        eyebrow="Teaching"
        title={VIEWS[view]?.title ?? 'My courses'}
        subtitle={VIEWS[view]?.subtitle ?? 'Class lists, attendance, grades and materials for the courses you teach.'}
      />
      <ErrorNotice error={error} />
      <h2 className="section-title">This term</h2>
      <div className="card-grid">
        {current.map((c) => (
          <ClassCard key={c.id} offering={c} view={view} />
        ))}
      </div>
      {loaded && current.length === 0 && <EmptyState title="No classes assigned this term" text="Your Head of Department assigns classes." />}
      {past.length > 0 && (
        <>
          <h2 className="section-title">Earlier terms</h2>
          <div className="card-grid">
            {past.map((c) => (
              <ClassCard key={c.id} offering={c} view={view} />
            ))}
          </div>
        </>
      )}
    </section>
  )
}

function ClassCard({ offering, view }: { offering: Offering; view: string }) {
  return (
    <Link to={`/classes/${offering.id}${VIEWS[view] ? `?tab=${view}` : ''}`} className="class-card">
      <div className="class-card-top">
        <span className="code-chip">{offering.course.code}</span>
        <StateBadge status={offering.gradeStatus} />
      </div>
      <strong>{offering.course.title}</strong>
      <small className="muted">
        {offering.term.name} · {offering.course.credits} credits · Year {offering.course.yearLevel}
      </small>
      <div className="class-card-foot">
        <span>
          <Users size={16} /> {offering._count.enrollments} students
        </span>
        <ArrowRight size={18} />
      </div>
    </Link>
  )
}
