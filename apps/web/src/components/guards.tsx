import type { ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import type { Permission } from '../api/types'
import { useAuth } from '../auth/AuthContext'

export function RequireAuth({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth()
  const location = useLocation()
  if (loading) return <p className="muted center">Loading...</p>
  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname }} />
  if (user.mustChangePassword && location.pathname !== '/change-password') {
    return <Navigate to="/change-password" replace />
  }
  return <>{children}</>
}

export function RequirePermission({ permission, children }: { permission: Permission; children: ReactNode }) {
  const { can } = useAuth()
  if (!can(permission)) return <p className="notice error">You do not have access to this page.</p>
  return <>{children}</>
}
