import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AuthProvider } from './auth/AuthContext'
import { Layout } from './components/Layout'
import { RequireAuth, RequirePermission } from './components/guards'
import { AuditPage } from './pages/AuditPage'
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
