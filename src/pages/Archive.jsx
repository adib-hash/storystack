import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../lib/AuthContext'
import { getEntries } from '../lib/firebase'
import { format } from 'date-fns'
import { Search, ChevronRight } from 'lucide-react'
import styles from './Archive.module.css'

const DOMAIN_LABELS = {
  work_leadership: 'Work & Leadership',
  family_relationships: 'Family & Relationships',
  faith_inner_life: 'Faith & Inner Life',
  childhood_formative: 'Childhood',
  travel_place: 'Travel & Place',
  money_risk_decisions: 'Risk & Decisions',
  observed_scenes: 'Observed Scenes',
}

const FRAMEWORK_LABELS = {
  empowerment_promise: 'Promise',
  salient_surprise: 'Surprise',
  brevity: 'Brevity',
  passion: 'Passion',
  strong_ending: 'Strong Ending',
  pause: 'Rhythm',
}

export default function Archive() {
  const user = useAuth()
  const [entries, setEntries] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [search, setSearch] = useState('')
  const [domainFilter, setDomainFilter] = useState('all')

  useEffect(() => {
    getEntries(user.uid)
      .then(data => { setEntries(data); setLoading(false) })
      .catch(err => { console.error(err); setError('Could not load your archive. Check your connection and try again.'); setLoading(false) })
  }, [user.uid])

  const filtered = entries.filter(e => {
    const matchDomain = domainFilter === 'all' || e.promptDomain === domainFilter
    const matchSearch = !search || (
      e.promptText?.toLowerCase().includes(search.toLowerCase()) ||
      e.body?.toLowerCase().includes(search.toLowerCase())
    )
    return matchDomain && matchSearch
  })

  // Stats
  const totalWords = entries.reduce((sum, e) => sum + (e.wordCount || 0), 0)
  const tagFreq = {}
  entries.forEach(e => (e.tags || []).forEach(t => { tagFreq[t] = (tagFreq[t] || 0) + 1 }))
  const weakest = Object.entries(FRAMEWORK_LABELS)
    .map(([k, v]) => ({ key: k, label: v, count: tagFreq[k] || 0 }))
    .sort((a, b) => a.count - b.count)[0]

  return (
    <main className={styles.main}>
      <div className={styles.container}>

        {entries.length > 0 && (
          <div className={styles.statsRow}>
            <Stat label="Stories" value={entries.length} />
            <Stat label="Words written" value={totalWords.toLocaleString()} />
            {weakest && <Stat label="Needs work" value={weakest.label} accent />}
          </div>
        )}

        <div className={styles.controls}>
          <div className={styles.searchWrap}>
            <Search size={15} className={styles.searchIcon} />
            <input
              className={styles.search}
              placeholder="Search stories…"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <select
            className={styles.select}
            value={domainFilter}
            onChange={e => setDomainFilter(e.target.value)}
          >
            <option value="all">All domains</option>
            {Object.entries(DOMAIN_LABELS).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>
        </div>

        {loading && <p className={styles.empty}>Loading your archive…</p>}

        {error && <p className={styles.errorState}>{error}</p>}

        {!loading && !error && filtered.length === 0 && (
          <div className={styles.empty}>
            {entries.length === 0
              ? <><p className={styles.emptyTitle}>Your archive is empty.</p><p>Write your first story to begin.</p></>
              : <p>No stories match that filter.</p>
            }
          </div>
        )}

        <div className={styles.list}>
          {filtered.map(entry => (
            <Link key={entry.id} to={`/entry/${entry.id}`} className={styles.card}>
              <div className={styles.cardTop}>
                <span className={styles.cardDomain}>
                  {DOMAIN_LABELS[entry.promptDomain] || entry.promptDomain}
                </span>
                <span className={styles.cardDate}>
                  {entry.createdAt?.toDate
                    ? format(entry.createdAt.toDate(), 'MMM d, yyyy')
                    : 'Recently'}
                </span>
              </div>
              <p className={styles.cardPrompt}>{entry.promptText}</p>
              <p className={styles.cardExcerpt}>{entry.body?.slice(0, 140)}{entry.body?.length > 140 ? '…' : ''}</p>
              <div className={styles.cardFooter}>
                <div className={styles.cardTags}>
                  {(entry.tags || []).map(t => (
                    <span key={t} className={styles.cardTag}>{FRAMEWORK_LABELS[t] || t}</span>
                  ))}
                </div>
                <span className={styles.cardWc}>{entry.wordCount || 0}w</span>
                <ChevronRight size={15} className={styles.chevron} />
              </div>
            </Link>
          ))}
        </div>

      </div>
    </main>
  )
}

function Stat({ label, value, accent }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
      <span style={{ fontSize: '1.5rem', fontFamily: 'var(--font-serif)', fontWeight: 600, color: accent ? 'var(--amber)' : 'var(--ink)' }}>
        {value}
      </span>
      <span style={{ fontSize: '0.75rem', color: 'var(--ink-muted)', textTransform: 'uppercase', letterSpacing: '0.07em' }}>
        {label}
      </span>
    </div>
  )
}
