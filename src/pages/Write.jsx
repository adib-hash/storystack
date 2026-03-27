import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '../lib/AuthContext'
import { saveEntry, getEntries } from '../lib/firebase'
import { RefreshCw, ChevronDown, ChevronUp, Check, Lightbulb } from 'lucide-react'
import styles from './Write.module.css'

const DOMAIN_LABELS = {
  work_leadership: 'Work & Leadership',
  family_relationships: 'Family & Relationships',
  faith_inner_life: 'Faith & Inner Life',
  childhood_formative: 'Childhood',
  travel_place: 'Travel & Place',
  money_risk_decisions: 'Risk & Decisions',
  observed_scenes: 'Observed Scenes',
}

const FRAMEWORK_TAGS = [
  { id: 'empowerment_promise', label: 'Empowerment Promise', description: 'Did it open with a hook or implicit promise?' },
  { id: 'salient_surprise', label: 'Salient Surprise', description: 'Is there a turn or unexpected detail?' },
  { id: 'brevity', label: 'Brevity', description: 'Did you say it and stop?' },
  { id: 'passion', label: 'Passion', description: 'Can a reader feel you care about this?' },
  { id: 'strong_ending', label: 'Strong Ending', description: 'Did it end on contribution, not a fade?' },
  { id: 'pause', label: 'Pause/Rhythm', description: 'Did you use white space or rhythm deliberately?' },
]

const DRAFT_KEY = 'ss-draft'

function getSeededPrompt(prompts, seed) {
  if (!prompts.length) return null
  return prompts[seed % prompts.length]
}

function getTodaySeed() {
  const d = new Date()
  return d.getFullYear() * 10000 + (d.getMonth() + 1) * 100 + d.getDate()
}

export default function Write() {
  const user = useAuth()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const revisitPromptId = searchParams.get('promptId')

  const [prompts, setPrompts] = useState([])
  const [prompt, setPrompt] = useState(null)
  const [text, setText] = useState('')
  const [tags, setTags] = useState([])
  const [tagNotes, setTagNotes] = useState({})
  const [showNudge, setShowNudge] = useState(false)
  const [showTags, setShowTags] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [saveError, setSaveError] = useState(null)
  const [wordCount, setWordCount] = useState(0)
  const [domainFilter, setDomainFilter] = useState('all')
  const [draftRestored, setDraftRestored] = useState(false)
  const [domainCounts, setDomainCounts] = useState({})
  const textareaRef = useRef(null)

  // Load prompts + restore draft or apply revisit prompt
  useEffect(() => {
    fetch('/prompts.json')
      .then(r => r.json())
      .then(data => {
        setPrompts(data)

        let chosenPrompt
        if (revisitPromptId) {
          chosenPrompt = data.find(p => String(p.id) === String(revisitPromptId))
        }

        if (!chosenPrompt) {
          const seed = getTodaySeed()
          chosenPrompt = data[seed % data.length]
        }

        setPrompt(chosenPrompt)

        // Restore draft if it matches current prompt
        if (!revisitPromptId) {
          try {
            const raw = localStorage.getItem(DRAFT_KEY)
            if (raw) {
              const draft = JSON.parse(raw)
              if (draft.promptId === chosenPrompt.id && draft.text) {
                setText(draft.text)
                setDraftRestored(true)
                setTimeout(() => setDraftRestored(false), 2500)
              }
            }
          } catch {
            // ignore malformed draft
          }
        }
      })
  }, [revisitPromptId])

  // Fetch domain distribution for rotation awareness
  useEffect(() => {
    getEntries(user.uid).then(entries => {
      const counts = {}
      entries.forEach(e => {
        if (e.promptDomain) counts[e.promptDomain] = (counts[e.promptDomain] || 0) + 1
      })
      setDomainCounts(counts)
    }).catch(() => {})
  }, [user.uid])

  // Auto-save draft on text change
  useEffect(() => {
    if (!prompt || !text) return
    try {
      localStorage.setItem(DRAFT_KEY, JSON.stringify({ promptId: prompt.id, text }))
    } catch {
      // ignore storage errors
    }
  }, [text, prompt])

  useEffect(() => {
    const words = text.trim().split(/\s+/).filter(Boolean)
    setWordCount(text.trim() ? words.length : 0)
  }, [text])

  // Keyboard shortcut: Cmd/Ctrl+S to save
  const handleSave = useCallback(async () => {
    if (!text.trim() || saving || saved) return
    setSaving(true)
    setSaveError(null)
    try {
      const entry = {
        promptId: prompt.id,
        promptText: prompt.prompt,
        promptDomain: prompt.domain,
        nudgeType: prompt.craft_nudge_type,
        nudgeText: prompt.craft_nudge_text,
        body: text.trim(),
        wordCount,
        tags,
        tagNotes,
      }
      const ref = await saveEntry(user.uid, entry)
      try { localStorage.removeItem(DRAFT_KEY) } catch {}
      setSaved(true)
      setTimeout(() => navigate(`/entry/${ref.id}`), 600)
    } catch (e) {
      console.error(e)
      setSaveError('Could not save. Check your connection and try again.')
      setSaving(false)
    }
  }, [text, saving, saved, prompt, wordCount, tags, tagNotes, user.uid, navigate])

  useEffect(() => {
    const onKeyDown = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        e.preventDefault()
        handleSave()
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [handleSave])

  const filteredPrompts = domainFilter === 'all'
    ? prompts
    : prompts.filter(p => p.domain === domainFilter)

  const rollPrompt = () => {
    if (!filteredPrompts.length) return
    const newPrompt = filteredPrompts[Math.floor(Math.random() * filteredPrompts.length)]
    setPrompt(newPrompt)
    setText('')
    setTags([])
    setTagNotes({})
    setShowNudge(false)
    setShowTags(false)
    setSaved(false)
    setSaveError(null)
    try { localStorage.removeItem(DRAFT_KEY) } catch {}
  }

  const toggleTag = (id) => {
    setTags(prev => {
      const next = prev.includes(id) ? prev.filter(t => t !== id) : [...prev, id]
      // Clear note if tag removed
      if (prev.includes(id)) {
        setTagNotes(n => { const copy = { ...n }; delete copy[id]; return copy })
      }
      return next
    })
  }

  const totalEntries = Object.values(domainCounts).reduce((s, v) => s + v, 0)

  if (!prompt) return (
    <div className={styles.loader}>
      <span>Finding your prompt…</span>
    </div>
  )

  return (
    <main className={styles.main}>
      <div className={styles.container}>

        {/* Domain filter with rotation awareness */}
        <div className={styles.filterRow}>
          <span className={styles.filterLabel}>Domain</span>
          <div className={styles.filters}>
            <button
              className={`${styles.filter} ${domainFilter === 'all' ? styles.filterActive : ''}`}
              onClick={() => setDomainFilter('all')}
            >All</button>
            {Object.entries(DOMAIN_LABELS).map(([key, label]) => {
              const count = domainCounts[key] || 0
              const pct = totalEntries > 0 ? Math.round((count / totalEntries) * 100) : null
              return (
                <button
                  key={key}
                  className={`${styles.filter} ${domainFilter === key ? styles.filterActive : ''}`}
                  onClick={() => setDomainFilter(key)}
                  title={pct !== null ? `${count} ${count === 1 ? 'story' : 'stories'} (${pct}% of archive)` : label}
                >
                  {label}
                  {pct !== null && (
                    <span className={`${styles.filterPct} ${pct === 0 ? styles.filterPctZero : ''}`}>{pct}%</span>
                  )}
                </button>
              )
            })}
          </div>
        </div>

        {/* Prompt card */}
        <div className={styles.promptCard}>
          <div className={styles.promptMeta}>
            <span className={styles.domain}>{DOMAIN_LABELS[prompt.domain]}</span>
            <button className={styles.rollBtn} onClick={rollPrompt} title="New prompt">
              <RefreshCw size={14} />
              <span>New prompt</span>
            </button>
          </div>

          <p className={styles.promptText}>{prompt.prompt}</p>

          {/* Craft nudge */}
          <button
            className={styles.nudgeToggle}
            onClick={() => setShowNudge(v => !v)}
          >
            <Lightbulb size={13} />
            <span>Craft {prompt.craft_nudge_type}</span>
            {showNudge ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
          </button>

          {showNudge && (
            <div className={styles.nudge}>
              {prompt.craft_nudge_text}
            </div>
          )}
        </div>

        {/* Editor */}
        <div className={styles.editorWrap}>
          {draftRestored && (
            <div className={styles.draftBanner}>Draft restored</div>
          )}
          <textarea
            ref={textareaRef}
            className={styles.editor}
            placeholder="Begin here. Don't think too long before the first sentence."
            value={text}
            onChange={e => { setText(e.target.value); setSaveError(null) }}
            autoFocus
          />
          <div className={styles.editorFooter}>
            <span className={styles.wc}>{wordCount} {wordCount === 1 ? 'word' : 'words'}</span>
            <span className={styles.shortcutHint}>⌘S to save</span>
          </div>
        </div>

        {/* Framework tags with reflection notes */}
        <div className={styles.tagsSection}>
          <button
            className={styles.tagsToggle}
            onClick={() => setShowTags(v => !v)}
          >
            <span>Self-assess against the framework</span>
            {showTags ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>

          {showTags && (
            <div className={styles.tagsGrid}>
              {FRAMEWORK_TAGS.map(tag => {
                const isOn = tags.includes(tag.id)
                return (
                  <div key={tag.id} className={styles.tagWrap}>
                    <button
                      className={`${styles.tag} ${isOn ? styles.tagOn : ''}`}
                      onClick={() => toggleTag(tag.id)}
                      title={tag.description}
                    >
                      {isOn && <Check size={11} />}
                      {tag.label}
                    </button>
                    {isOn && (
                      <input
                        className={styles.tagNoteInput}
                        placeholder="Note…"
                        value={tagNotes[tag.id] || ''}
                        onChange={e => setTagNotes(prev => ({ ...prev, [tag.id]: e.target.value }))}
                      />
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Save */}
        <div className={styles.actions}>
          <button
            className={`${styles.saveBtn} ${saved ? styles.saveDone : ''}`}
            onClick={handleSave}
            disabled={!text.trim() || saving || saved}
          >
            {saved ? (
              <><Check size={16} /> Saved</>
            ) : saving ? 'Saving…' : 'Save to Archive'}
          </button>
        </div>

        {saveError && (
          <p className={styles.saveError}>{saveError}</p>
        )}

      </div>
    </main>
  )
}
