import { Navigate, Route, Routes } from 'react-router-dom'

import { AdminShell } from '@/components/layout/AdminShell'
import { RequireAuth } from '@/components/RequireAuth'
import { CreateFirstUser } from '@/pages/CreateFirstUser'
import { Dashboard } from '@/pages/Dashboard'
import { Login } from '@/pages/Login'
import { Placeholder } from '@/pages/Placeholder'

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/create-first-user" element={<CreateFirstUser />} />
      <Route element={<RequireAuth />}>
        <Route element={<AdminShell />}>
          <Route index element={<Dashboard />} />
          <Route
            path="reports"
            element={<Placeholder title="Reports" description="Filters, charts and CSV export — Phase 3." />}
          />
          {['users', 'media', 'pages', 'categories', 'shipping', 'commissions'].map((slug) => (
            <Route
              key={slug}
              path={`collections/${slug}`}
              element={
                <Placeholder
                  title={slug.charAt(0).toUpperCase() + slug.slice(1)}
                  description="Collection CRUD — Phase 4."
                />
              }
            />
          ))}
          <Route
            path="globals/:slug"
            element={<Placeholder title="Globals" description="Global editing — Phase 4." />}
          />
        </Route>
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
