import { useEffect, useState } from 'react'
import { api, errorMessage } from '../api/client'
import type { Student } from '../api/types'
import { ErrorNotice } from '../components/Field'
import { StudentDetails } from '../components/StudentDetails'

export function MyRecordPage() {
  const [student, setStudent] = useState<Student | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    api<Student>('/students/me')
      .then(setStudent)
      .catch((err) => setError(errorMessage(err)))
  }, [])

  return (
    <section className="narrow">
      <h1>My record</h1>
      <ErrorNotice error={error} />
      {student && <StudentDetails student={student} />}
    </section>
  )
}
