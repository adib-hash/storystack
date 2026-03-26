import { Link, useLocation } from 'react-router-dom'
import { signOutUser } from '../lib/firebase'
import { useAuth } from '../lib/AuthContext'
import { PenLine, BookOpen, LogOut } from 'lucide-react'
import styles from './Nav.module.css'

export default function Nav() {
  const location = useLocation()
  const user = useAuth()

  return (
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

        <button className={styles.signout} onClick={signOutUser} title="Sign out">
          <LogOut size={15} />
        </button>
      </div>
    </nav>
  )
}
