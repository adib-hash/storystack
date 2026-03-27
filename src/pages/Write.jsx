import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../lib/AuthContext'
import { saveEntry } from '../lib/firebase'
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
  const [prompts, setPrompts] = useState([])
  const [promptIndex, setPromptIndex] = useState(0)
  const [prompt, setPrompt] = useState(null)
  const [text, setText] = useState('')
  const [tags, setTags] = useState([])
  const [showNudge, setShowNudge] = useState(false)
  const [showTags, setShowTags] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [saveError, setSaveError] = useState(null)
  const [wordCount, setWordCount] = useState(0)
  const [domainFilter, setDomainFilter] = useState('all')
  const [draftRestored, setDraftRestored] = useState(false)
  const textareaRef = useRef(null)

  useEffect(() => {
    fetch('/prompts.json')
      .then(r => r.json())
      .then(data => {
        setPrompts(data)
        const seed = getTodaySeed()
        const todayPrompt = data[seed % data.length]
        setPromptIndex(seed % data.length)
        setPrompt(todayPrompt)

        // Restore draft if it matches today's prompt
        try {
          const raw = localStorage.getItem(DRAFT_KEY)
          if (raw) {
            const draft = JSON.parse(raw)
            if (draft.promptId === todayPrompt.id && draft.text) {
              setText(draft.text)
              setDraftRestored(true)
              setTimeout(() => setDraftRestored(false), 2500)
            }
          }
        } catch {
          // ignore malformed draft
        }
      })
  }, [])

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

  const filteredPrompts = domainFilter === 'all'
    ? prompts
    : prompts.filter(p => p.domain === domainFilter)

  const rollPrompt = () => {
    if (!filteredPrompts.length) return
    let newIdx = Math.floor(Math.random() * filteredPrompts.length)
    setPrompt(filteredPrompts[newIdx])
    setPromptIndex(newIdx)
    setText('')
    setTags([])
    setShowNudge(false)
    setShowTags(false)
    setSaved(false)
    setSaveError(null)
    try { localStorage.removeItem(DRAFT_KEY) } catch {}
  }

  const toggleTag = (id) => {
    setTags(prev => prev.includes(id) ? prev.filter(t => t !== id) : [...prev, id])
  }

  const handleSave = async () => {
    if (!text.trim() || saving) return
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
      }
      const ref = await saveEntry(user.uid, entry)
      try { localStorage.removeItem(DRAFT_KEY) } catch {}
      setSaved(true)
      setTimeout(() => navigate(`/entry/${ref.id}`), 600)
    } catch (e) {
      console.error(e)
      setSaveError(`Could not save: ${e?.code || e?.message || 'Unknown error'}`)
      setSaving(false)
    }
  }

  if (!prompt) return (
    <div className={styles.loader}>
      <span>Finding your prompt…</span>
    </div>
  )

  return (
    <main className={styles.main}>
      <div className={styles.container}>

        {/* Domain filter */}
        <div className={styles.filterRow}>
          <span className={styles.filterLabel}>Domain</span>
          <div className={styles.filters}>
            <button
              className={`${styles.filter} ${domainFilter === 'all' ? styles.filterActive : ''}`}
              onClick={() => setDomainFilter('all')}
            >All</button>
            {Object.entries(DOMAIN_LABELS).map(([key, label]) => (
              <button
                key={key}
                className={`${styles.filter} ${domainFilter === key ? styles.filterActive : ''}`}
                onClick={() => setDomainFilter(key)}
              >{label}</button>
            ))}
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
          </div>
        </div>

        {/* Framework tags */}
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
              {FRAMEWORK_TAGS.map(tag => (
                <button
                  key={tag.id}
                  className={`${styles.tag} ${tags.includes(tag.id) ? styles.tagOn : ''}`}
                  onClick={() => toggleTag(tag.id)}
                  title={tag.description}
                >
                  {tags.includes(tag.id) && <Check size={11} />}
                  {tag.label}
                </button>
              ))}
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
