import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../lib/AuthContext'
import { getEntry, updateEntry, deleteEntry } from '../lib/firebase'
import { format } from 'date-fns'
import { ArrowLeft, Pencil, Trash2, Check, X } from 'lucide-react'
import styles from './EntryDetail.module.css'

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
  { id: 'empowerment_promise', label: 'Empowerment Promise' },
  { id: 'salient_surprise', label: 'Salient Surprise' },
  { id: 'brevity', label: 'Brevity' },
  { id: 'passion', label: 'Passion' },
  { id: 'strong_ending', label: 'Strong Ending' },
  { id: 'pause', label: 'Pause/Rhythm' },
]

export default function EntryDetail() {
  const { id } = useParams()
  const user = useAuth()
  const navigate = useNavigate()

  const [entry, setEntry] = useState(null)
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(false)
  const [editBody, setEditBody] = useState('')
  const [editTags, setEditTags] = useState([])
  const [saving, setSaving] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)

  useEffect(() => {
    getEntry(user.uid, id).then(data => {
      if (!data) { navigate('/archive'); return }
      setEntry(data)
      setEditBody(data.body)
      setEditTags(data.tags || [])
      setLoading(false)
    })
  }, [user.uid, id])

  const handleSave = async () => {
    if (!editBody.trim() || saving) return
    setSaving(true)
    const wc = editBody.trim().split(/\s+/).filter(Boolean).length
    await updateEntry(user.uid, id, { body: editBody.trim(), tags: editTags, wordCount: wc })
    setEntry(prev => ({ ...prev, body: editBody.trim(), tags: editTags, wordCount: wc }))
    setEditing(false)
    setSaving(false)
  }

  const handleDelete = async () => {
    await deleteEntry(user.uid, id)
    navigate('/archive')
  }

  const toggleTag = (tagId) => {
    setEditTags(prev =>
      prev.includes(tagId) ? prev.filter(t => t !== tagId) : [...prev, tagId]
    )
  }

  if (loading) return (
    <div className={styles.loader}>Loading…</div>
  )

  const dateStr = entry.createdAt?.toDate
    ? format(entry.createdAt.toDate(), 'EEEE, MMMM d, yyyy')
    : 'Recently'

  return (
    <main className={styles.main}>
      <div className={styles.container}>

        {/* Back + actions */}
        <div className={styles.topBar}>
          <Link to="/archive" className={styles.back}>
            <ArrowLeft size={15} />
            <span>Archive</span>
          </Link>
          <div className={styles.actions}>
            {!editing && (
              <>
                <button className={styles.iconBtn} onClick={() => setEditing(true)} title="Edit">
                  <Pencil size={15} />
                </button>
                {confirmDelete ? (
                  <div className={styles.confirmRow}>
                    <span className={styles.confirmLabel}>Delete this story?</span>
                    <button className={`${styles.iconBtn} ${styles.danger}`} onClick={handleDelete}>
                      <Check size={15} />
                    </button>
                    <button className={styles.iconBtn} onClick={() => setConfirmDelete(false)}>
                      <X size={15} />
                    </button>
                  </div>
                ) : (
                  <button className={`${styles.iconBtn} ${styles.danger}`} onClick={() => setConfirmDelete(true)} title="Delete">
                    <Trash2 size={15} />
                  </button>
                )}
              </>
            )}
            {editing && (
              <>
                <button className={`${styles.iconBtn} ${styles.save}`} onClick={handleSave} disabled={saving}>
                  <Check size={15} />
                  <span>{saving ? 'Saving…' : 'Save'}</span>
                </button>
                <button className={styles.iconBtn} onClick={() => {
                  setEditing(false)
                  setEditBody(entry.body)
                  setEditTags(entry.tags || [])
                }}>
                  <X size={15} />
                </button>
              </>
            )}
          </div>
        </div>

        {/* Meta */}
        <div className={styles.meta}>
          <span className={styles.domain}>{DOMAIN_LABELS[entry.promptDomain] || entry.promptDomain}</span>
          <span className={styles.date}>{dateStr}</span>
        </div>

        {/* Prompt */}
        <div className={styles.promptBlock}>
          <p className={styles.promptLabel}>Prompt</p>
          <p className={styles.promptText}>{entry.promptText}</p>
          {entry.nudgeText && (
            <p className={styles.nudge}>
              <span className={styles.nudgeType}>{entry.nudgeType === 'technique' ? 'Technique' : 'Constraint'}: </span>
              {entry.nudgeText}
            </p>
          )}
        </div>

        {/* Body */}
        {editing ? (
          <div className={styles.editorWrap}>
            <textarea
              className={styles.editor}
              value={editBody}
              onChange={e => setEditBody(e.target.value)}
              autoFocus
            />
            <div className={styles.editorFooter}>
              <span className={styles.wc}>
                {editBody.trim().split(/\s+/).filter(Boolean).length} words
              </span>
            </div>
          </div>
        ) : (
          <div className={styles.body}>
            {entry.body.split('\n').filter(Boolean).map((para, i) => (
              <p key={i}>{para}</p>
            ))}
          </div>
        )}

        {/* Stats row */}
        <div className={styles.statsRow}>
          <span className={styles.wc}>{entry.wordCount || 0} words</span>
        </div>

        {/* Framework tags */}
        <div className={styles.tagsSection}>
          <p className={styles.tagsLabel}>Framework self-assessment</p>
          <div className={styles.tagsGrid}>
            {FRAMEWORK_TAGS.map(tag => {
              const active = editing
                ? editTags.includes(tag.id)
                : (entry.tags || []).includes(tag.id)
              return (
                <button
                  key={tag.id}
                  className={`${styles.tag} ${active ? styles.tagOn : ''} ${!editing ? styles.tagReadOnly : ''}`}
                  onClick={() => editing && toggleTag(tag.id)}
                  disabled={!editing}
                >
                  {active && <Check size={11} />}
                  {tag.label}
                </button>
              )
            })}
          </div>
          {!editing && (entry.tags || []).length === 0 && (
            <p className={styles.noTags}>No framework tags — edit to add some.</p>
          )}
        </div>

      </div>
    </main>
  )
}
