import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../lib/AuthContext'
import { getEntries } from '../lib/firebase'
import { format, differenceInCalendarDays, startOfDay, subWeeks, startOfWeek } from 'date-fns'
import { Search, ChevronRight, Download, Flame, Trophy, PenLine } from 'lucide-react'
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

function computeStreaks(entries) {
  if (!entries.length) return { current: 0, longest: 0 }

  // Build set of unique date strings from entries
  const dateset = new Set()
  entries.forEach(e => {
    if (e.createdAt?.toDate) {
      dateset.add(format(e.createdAt.toDate(), 'yyyy-MM-dd'))
    }
  })

  const today = format(new Date(), 'yyyy-MM-dd')
  const yesterday = format(new Date(Date.now() - 86400000), 'yyyy-MM-dd')

  // Current streak
  let current = 0
  const startDate = dateset.has(today) ? new Date() : dateset.has(yesterday) ? new Date(Date.now() - 86400000) : null
  if (startDate) {
    let check = startOfDay(startDate)
    while (dateset.has(format(check, 'yyyy-MM-dd'))) {
      current++
      check = new Date(check.getTime() - 86400000)
    }
  }

  // Longest streak
  const sorted = [...dateset].sort()
  let longest = 0
  let run = 0
  let prev = null
  for (const d of sorted) {
    if (prev === null) {
      run = 1
    } else {
      const diff = differenceInCalendarDays(new Date(d), new Date(prev))
      run = diff === 1 ? run + 1 : 1
    }
    if (run > longest) longest = run
    prev = d
  }

  return { current, longest }
}

function buildWeeklyChart(entries) {
  // Last 12 weeks bucketed by week start (Mon)
  const weeks = []
  const now = new Date()
  for (let i = 11; i >= 0; i--) {
    const weekStart = startOfWeek(subWeeks(now, i), { weekStartsOn: 1 })
    weeks.push({ weekStart, words: 0, label: format(weekStart, 'MMM d') })
  }

  entries.forEach(e => {
    if (!e.createdAt?.toDate) return
    const d = e.createdAt.toDate()
    const ws = startOfWeek(d, { weekStartsOn: 1 })
    const wsStr = format(ws, 'yyyy-MM-dd')
    const bucket = weeks.find(w => format(w.weekStart, 'yyyy-MM-dd') === wsStr)
    if (bucket) bucket.words += e.wordCount || 0
  })

  return weeks
}

function exportEntries(entries) {
  const lines = entries.map(e => {
    const date = e.createdAt?.toDate ? format(e.createdAt.toDate(), 'MMMM d, yyyy') : 'Unknown date'
    const domain = DOMAIN_LABELS[e.promptDomain] || e.promptDomain || ''
    const separator = '─'.repeat(60)
    return [separator, `${date}  ·  ${domain}`, `Prompt: ${e.promptText}`, '', e.body, ''].join('\n')
  })
  const blob = new Blob([lines.join('\n')], { type: 'text/plain' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `storystack-${format(new Date(), 'yyyy-MM-dd')}.txt`
  a.click()
  URL.revokeObjectURL(url)
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

  const streaks = computeStreaks(entries)
  const weeklyData = buildWeeklyChart(entries)
  const maxWords = Math.max(...weeklyData.map(w => w.words), 1)

  return (
    <main className={styles.main}>
      <div className={styles.container}>

        {entries.length > 0 && (
          <>
            <div className={styles.statsRow}>
              <Stat label="Stories" value={entries.length} />
              <Stat label="Words written" value={totalWords.toLocaleString()} />
              {streaks.current > 0 && (
                <Stat label="Day streak" value={streaks.current} icon={<Flame size={16} />} accent />
              )}
              {streaks.longest > 1 && (
                <Stat label="Best streak" value={streaks.longest} icon={<Trophy size={14} />} />
              )}
              {weakest && <Stat label="Needs work" value={weakest.label} muted />}
            </div>

            <div className={styles.chartSection}>
              <p className={styles.chartLabel}>Words per week — last 12 weeks</p>
              <div className={styles.chart}>
                {weeklyData.map((w, i) => {
                  const pct = maxWords > 0 ? (w.words / maxWords) * 100 : 0
                  return (
                    <div key={i} className={styles.chartCol} title={`${w.label}: ${w.words.toLocaleString()} words`}>
                      <div className={styles.barWrap}>
                        <div
                          className={styles.bar}
                          style={{ height: `${Math.max(pct, w.words > 0 ? 4 : 0)}%` }}
                        />
                      </div>
                      {i % 4 === 0 && <span className={styles.barLabel}>{w.label}</span>}
                    </div>
                  )
                })}
              </div>
            </div>
          </>
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
          {entries.length > 0 && (
            <button className={styles.exportBtn} onClick={() => exportEntries(entries)} title="Export all stories as text">
              <Download size={14} />
              <span>Export</span>
            </button>
          )}
        </div>

        {loading && <p className={styles.empty}>Loading your archive…</p>}

        {error && <p className={styles.errorState}>{error}</p>}

        {!loading && !error && filtered.length === 0 && (
          <div className={styles.emptyState}>
            {entries.length === 0 ? (
              <>
                <PenLine size={32} className={styles.emptyIcon} />
                <p className={styles.emptyTitle}>Your archive is empty.</p>
                <p className={styles.emptyBody}>Every great writing practice starts with a single story. Your first prompt is waiting.</p>
                <Link to="/" className={styles.emptyBtn}>Start writing</Link>
              </>
            ) : (
              <p className={styles.emptyNoMatch}>No stories match that filter.</p>
            )}
          </div>
        )}

        <div className={styles.list}>
          {filtered.map(entry => {
            const readMins = Math.ceil((entry.wordCount || 0) / 200)
            return (
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
                  {readMins > 0 && <span className={styles.cardRead}>{readMins} min read</span>}
                  <ChevronRight size={15} className={styles.chevron} />
                </div>
              </Link>
            )
          })}
        </div>

      </div>
    </main>
  )
}

function Stat({ label, value, icon, accent, muted }) {
  return (
    <div className={styles.stat}>
      <span className={`${styles.statValue} ${accent ? styles.statAccent : ''} ${muted ? styles.statMuted : ''}`}>
        {icon && <span className={styles.statIcon}>{icon}</span>}
        {value}
      </span>
      <span className={styles.statLabel}>{label}</span>
    </div>
  )
}
