import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AuthProvider } from './auth/AuthContext'
import { Layout } from './components/Layout'
import { RequireAuth, RequirePermission } from './components/guards'
import { ApprovalsPage } from './pages/academics/ApprovalsPage'
import { CoursesPage } from './pages/academics/CoursesPage'
import { ReportsPage } from './pages/academics/ReportsPage'
import { TermsPage } from './pages/academics/TermsPage'
import { ApplyPage } from './pages/ApplyPage'
import { AuditPage } from './pages/AuditPage'
import { ExamCardPage } from './pages/exam/ExamCardPage'
import { ProvisionalTranscriptPage } from './pages/exam/ProvisionalTranscriptPage'
import { RolesPage } from './pages/RolesPage'
import { MyReceiptsPage } from './pages/student/MyReceiptsPage'
import { ApplicationsPage } from './pages/operations/ApplicationsPage'
import { FinancePage } from './pages/operations/FinancePage'
import { RequestsPage } from './pages/operations/RequestsPage'
import { MyCoursesPage } from './pages/student/MyCoursesPage'
import { MyFeesPage } from './pages/student/MyFeesPage'
import { MyGradesPage } from './pages/student/MyGradesPage'
import { MyRequestsPage } from './pages/student/MyRequestsPage'
import { ClassPage } from './pages/teaching/ClassPage'
import { ClassesPage } from './pages/teaching/ClassesPage'
import { ChangePasswordPage } from './pages/ChangePasswordPage'
import { DashboardPage } from './pages/DashboardPage'
import { LoginPage } from './pages/LoginPage'
import { MyRecordPage } from './pages/MyRecordPage'
import { RegisterStudentPage } from './pages/RegisterStudentPage'
import { StructurePage } from './pages/StructurePage'
import { StudentDetailPage } from './pages/StudentDetailPage'
import { StudentsPage } from './pages/StudentsPage'
import { UsersPage } from './pages/UsersPage'

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/apply" element={<ApplyPage />} />
          <Route
            element={
              <RequireAuth>
                <Layout />
              </RequireAuth>
            }
          >
            <Route index element={<DashboardPage />} />
            <Route path="change-password" element={<ChangePasswordPage />} />
            <Route path="me" element={<MyRecordPage />} />
            <Route
              path="students"
              element={
                <RequirePermission permission="students.view">
                  <StudentsPage />
                </RequirePermission>
              }
            />
            <Route
              path="students/new"
              element={
                <RequirePermission permission="students.register">
                  <RegisterStudentPage />
                </RequirePermission>
              }
            />
            <Route path="students/:id" element={<StudentDetailPage />} />
            <Route
              path="my/courses"
              element={
                <RequirePermission permission="courses.register">
                  <MyCoursesPage />
                </RequirePermission>
              }
            />
            <Route
              path="my/grades"
              element={
                <RequirePermission permission="courses.register">
                  <MyGradesPage />
                </RequirePermission>
              }
            />
            <Route
              path="my/fees"
              element={
                <RequirePermission permission="fees.pay">
                  <MyFeesPage />
                </RequirePermission>
              }
            />
            <Route
              path="my/requests"
              element={
                <RequirePermission permission="requests.submit">
                  <MyRequestsPage />
                </RequirePermission>
              }
            />
            <Route
              path="classes"
              element={
                <RequirePermission permission="teaching">
                  <ClassesPage />
                </RequirePermission>
              }
            />
            <Route
              path="courses"
              element={
                <RequirePermission permission="courses.manage">
                  <CoursesPage />
                </RequirePermission>
              }
            />
            <Route
              path="approvals"
              element={
                <RequirePermission permission="grades.approve">
                  <ApprovalsPage />
                </RequirePermission>
              }
            />
            <Route
              path="terms"
              element={
                <RequirePermission permission="terms.manage">
                  <TermsPage />
                </RequirePermission>
              }
            />
            <Route
              path="reports"
              element={
                <RequirePermission permission="reports.view">
                  <ReportsPage />
                </RequirePermission>
              }
            />
            <Route
              path="finance"
              element={
                <RequirePermission permission="finance.manage">
                  <FinancePage />
                </RequirePermission>
              }
            />
            <Route
              path="requests"
              element={
                <RequirePermission permission="requests.manage">
                  <RequestsPage />
                </RequirePermission>
              }
            />
            <Route
              path="applications"
              element={
                <RequirePermission permission="applications.manage">
                  <ApplicationsPage />
                </RequirePermission>
              }
            />
            <Route path="classes/:id" element={<ClassPage />} />
            <Route
              path="my/receipts"
              element={
                <RequirePermission permission="fees.pay">
                  <MyReceiptsPage />
                </RequirePermission>
              }
            />
            <Route
              path="exam/cat-card"
              element={
                <RequirePermission permission="courses.register">
                  <ExamCardPage type="cat" />
                </RequirePermission>
              }
            />
            <Route
              path="exam/exam-card"
              element={
                <RequirePermission permission="courses.register">
                  <ExamCardPage type="exam" />
                </RequirePermission>
              }
            />
            <Route
              path="exam/transcript"
              element={
                <RequirePermission permission="courses.register">
                  <ProvisionalTranscriptPage />
                </RequirePermission>
              }
            />
            <Route
              path="roles"
              element={
                <RequirePermission permission="users.manage">
                  <RolesPage />
                </RequirePermission>
              }
            />
            <Route
              path="structure"
              element={
                <RequirePermission permission="structure.view">
                  <StructurePage />
                </RequirePermission>
              }
            />
            <Route
              path="users"
              element={
                <RequirePermission permission="users.manage">
                  <UsersPage />
                </RequirePermission>
              }
            />
            <Route
              path="audit"
              element={
                <RequirePermission permission="audit.view">
                  <AuditPage />
                </RequirePermission>
              }
            />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}
