import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './lib/AuthContext'
import Login from './pages/Login'
import Write from './pages/Write'
import Archive from './pages/Archive'
import EntryDetail from './pages/EntryDetail'
import Nav from './components/Nav'

function ProtectedRoute({ children }) {
  const user = useAuth()
  if (user === undefined) return <PageLoader />
  if (!user) return <Navigate to="/login" replace />
  return children
}

function PageLoader() {
  return (
    <div style={{
      minHeight: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontFamily: 'var(--font-serif)', color: 'var(--ink-muted)', fontSize: '1.1rem'
    }}>
      <span style={{ opacity: 0.6 }}>Loading…</span>
    </div>
  )
}

export default function App() {
  const user = useAuth()

  return (
    <>
      {user && <Nav />}
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/" element={
          <ProtectedRoute><Write /></ProtectedRoute>
        } />
        <Route path="/archive" element={
          <ProtectedRoute><Archive /></ProtectedRoute>
        } />
        <Route path="/entry/:id" element={
          <ProtectedRoute><EntryDetail /></ProtectedRoute>
        } />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  )
}
