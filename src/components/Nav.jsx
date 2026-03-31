import { useState, useEffect } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { signOutUser } from '../lib/firebase'
import { useAuth } from '../lib/AuthContext'
import { PenLine, BookOpen } from 'lucide-react'
import styles from './Nav.module.css'

const APP_VERSION = 'v0.2.1'

function getTheme() {
  return localStorage.getItem('ss-theme') || 'light'
}

function applyTheme(theme) {
  if (theme === 'dark') {
    document.documentElement.classList.add('dark')
  } else {
    document.documentElement.classList.remove('dark')
  }
  localStorage.setItem('ss-theme', theme)
}

export default function Nav() {
  const location = useLocation()
  const user = useAuth()
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [isDark, setIsDark] = useState(() => getTheme() === 'dark')

  // Scroll lock when settings open
  useEffect(() => {
    if (settingsOpen) {
      const scrollY = window.scrollY
      document.body.style.position = 'fixed'
      document.body.style.top = `-${scrollY}px`
      document.body.style.width = '100%'
      return () => {
        const y = Math.abs(parseInt(document.body.style.top || '0'))
        document.body.style.position = ''
        document.body.style.top = ''
        document.body.style.width = ''
        window.scrollTo(0, y)
      }
    }
  }, [settingsOpen])

  // Escape key to close
  useEffect(() => {
    if (!settingsOpen) return
    const onKey = (e) => { if (e.key === 'Escape') setSettingsOpen(false) }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [settingsOpen])

  const toggleTheme = () => {
    const next = isDark ? 'light' : 'dark'
    setIsDark(!isDark)
    applyTheme(next)
  }

  return (
    <>
      <nav className={styles.nav}>
        <div className={styles.inner}>
          <Link to="/" className={styles.logo}>
            <span className={styles.logoText}>Story<span className={styles.logoAccent}>Stack</span></span>
          </Link>

          <div className={styles.links}>
            <Link to="/" className={`${styles.link} ${location.pathname === '/' ? styles.active : ''}`}>
              <PenLine size={16} />
              <span>Write</span>
            </Link>
            <Link to="/archive" className={`${styles.link} ${location.pathname === '/archive' ? styles.active : ''}`}>
              <BookOpen size={16} />
              <span>Archive</span>
            </Link>
          </div>

          <button
            className={styles.iconBtn}
            onClick={() => setSettingsOpen(true)}
            title="Settings"
            aria-label="Open settings"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="3" />
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
            </svg>
          </button>
        </div>
      </nav>

      {settingsOpen && (
        <div className={styles.modalBackdrop} onClick={() => setSettingsOpen(false)} aria-hidden="true">
          <div className={styles.modalCard} onClick={e => e.stopPropagation()} role="dialog" aria-modal="true" aria-label="Settings">

            <div className={styles.modalHeader}>
              <span className={styles.modalTitle}>Story<span className={styles.modalAccent}>Stack</span></span>
              <button className={styles.modalClose} onClick={() => setSettingsOpen(false)} aria-label="Close settings">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>

            <p className={styles.modalTagline}>A daily writing practice. One prompt, one story.</p>

            <div className={styles.modalDivider} />

            <div className={styles.modalRow}>
              <span className={styles.modalLabel}>Version</span>
              <span className={styles.modalValue}>{APP_VERSION}</span>
            </div>

            <div className={styles.modalRow}>
              <span className={styles.modalLabel}>Storage</span>
              <span className={styles.modalValue}>Firebase / Firestore</span>
            </div>

            <div className={styles.modalRow}>
              <span className={styles.modalLabel}>Night mode</span>
              <button
                className={`${styles.toggle} ${isDark ? styles.toggleOn : ''}`}
                onClick={toggleTheme}
                aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
              >
                <span className={styles.toggleThumb} />
              </button>
            </div>

            <div className={styles.modalDivider} />

            <button className={styles.signoutBtn} onClick={() => { setSettingsOpen(false); signOutUser() }}>
              Sign out{user?.displayName ? ` (${user.displayName})` : ''}
            </button>
          </div>
        </div>
      )}
    </>
  )
}
