# StoryStack

A personal storytelling practice app. One prompt. One story. One step at a time.

500 curated prompts across 7 domains, with craft nudges drawn from the best teaching on storytelling. Built on React + Vite, Firebase (Firestore + Auth), deployed on Vercel.

---

## Setup

### 1. Firebase project

1. Go to [console.firebase.google.com](https://console.firebase.google.com)
2. Create a new project (disable Google Analytics — you don't need it)
3. **Enable Firestore**: Build → Firestore Database → Create database → Start in production mode
4. **Enable Google Auth**: Build → Authentication → Sign-in method → Google → Enable
5. **Register a web app**: Project Settings → Your apps → Add app → Web → copy the config object

### 2. Environment variables

```bash
cp .env.example .env
```

Fill in your Firebase config values from step 1.

### 3. Deploy Firestore security rules

```bash
npm install -g firebase-tools
firebase login
firebase use --add   # select your project
firebase deploy --only firestore:rules
```

This locks Firestore so only authenticated users can read/write their own data.

### 4. Local development

```bash
npm install
npm run dev
```

### 5. Deploy to Vercel

```bash
npm install -g vercel
vercel
```

Add your 6 `VITE_FIREBASE_*` environment variables in the Vercel dashboard under Project → Settings → Environment Variables. Then redeploy.

---

## Project structure

```
src/
  lib/
    firebase.js        # Firebase init, auth helpers, Firestore helpers
    AuthContext.jsx    # React auth context
  components/
    Nav.jsx / Nav.module.css
  pages/
    Login.jsx / Login.module.css
    Write.jsx / Write.module.css      # Core writing experience
    Archive.jsx / Archive.module.css  # Entry list + search
    EntryDetail.jsx / EntryDetail.module.css  # Read + edit view
  App.jsx              # Routes
  main.jsx             # Entry point
  index.css            # Global design tokens + reset
public/
  prompts.json         # 500 writing prompts
firestore.rules        # Security rules — deploy via Firebase CLI
```

## Firestore data model

```
/users/{uid}/entries/{entryId}
  promptId        number
  promptText      string
  promptDomain    string
  nudgeType       'technique' | 'constraint'
  nudgeText       string
  body            string
  wordCount       number
  tags            string[]   # framework self-assessment tags
  createdAt       Timestamp
  updatedAt       Timestamp
```

## Free tier limits (Firebase Spark plan)

- 1 GB Firestore storage
- 50,000 reads / day
- 20,000 writes / day
- 20,000 deletes / day

More than sufficient for a personal writing app.
