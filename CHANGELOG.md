# Changelog

## 0.2.0 — 2026-03-26

### Fixed
- Archive page loading stuck indefinitely when Firestore call fails — added `.catch()` error handler that resolves loading state and shows a readable error message
- EntryDetail page loading stuck on fetch error — same fix applied
- Write page save errors are now shown to the user below the Save button (previously only logged to console)

### Added
- Dark/night mode with warm dark palette (dark charcoal + amber accents); persists to localStorage; flash-free init via inline script
- Settings modal accessible via gear icon in nav — shows app version, storage info, night mode toggle, and sign-out
- Draft auto-save to localStorage on every keystroke; draft is restored on return to Write page if it matches today's prompt; cleared on save or new prompt
- "Draft restored" indicator shown briefly when a draft is recovered

### Changed
- Viewport meta now includes `maximum-scale=1` to prevent iOS auto-zoom on input focus
- Search input and domain select in Archive now have explicit `font-size: 1rem` (iOS anti-zoom)
- Sign-out button moved from nav bar into Settings modal (less visual clutter)

## 0.1.0 — 2026-03-13

### Added
- Initial release: guided writing interface with 500 curated prompts across seven domains
- Craft nudges (technique and constraint) on each prompt
- Framework self-assessment tags: Empowerment Promise, Salient Surprise, Brevity, Passion, Strong Ending, Pause/Rhythm
- Firebase auth (Google sign-in) and Firestore storage — entries scoped per user
- Archive with full-text search and domain filtering; stats row showing total stories, total words, weakest framework tag
- Entry detail view with inline edit (body + tags) and delete with confirmation
- Daily seed-based prompt selection — same prompt shown each day, with option to roll a new one
