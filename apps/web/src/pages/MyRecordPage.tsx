import { useEffect, useState } from 'react'
import { api, errorMessage } from '../api/client'
import type { Student } from '../api/types'
import { ErrorNotice } from '../components/Field'
import { StudentDetails, StudentProfileHeader } from '../components/StudentDetails'

export function MyRecordPage() {
  const [student, setStudent] = useState<Student | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    api<Student>('/students/me')
      .then(setStudent)
      .catch((err) => setError(errorMessage(err)))
  }, [])

  return (
    <section>
      <ErrorNotice error={error} />
      {student && (
        <>
          <StudentProfileHeader student={student} />
          <StudentDetails student={student} />
          <p className="muted small">If any detail is wrong, contact the Registrar's office to correct it.</p>
        </>
      )}
    </section>
  )
}
