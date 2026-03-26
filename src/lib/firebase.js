// src/lib/firebase.js
// Replace these values with your own Firebase project config
// https://console.firebase.google.com → Project Settings → Your apps → Web app

import { initializeApp } from 'firebase/app'
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut } from 'firebase/auth'
import {
  getFirestore,
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  getDocs,
  getDoc,
  query,
  where,
  orderBy,
  serverTimestamp,
} from 'firebase/firestore'

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
}

const app = initializeApp(firebaseConfig)
export const auth = getAuth(app)
export const db = getFirestore(app)
export const googleProvider = new GoogleAuthProvider()

// Auth helpers
export const signInWithGoogle = () => signInWithPopup(auth, googleProvider)
export const signOutUser = () => signOut(auth)

// Firestore helpers — all scoped to authenticated user
export const entriesRef = (uid) => collection(db, 'users', uid, 'entries')

export const saveEntry = async (uid, entryData) => {
  const ref = entriesRef(uid)
  return addDoc(ref, { ...entryData, createdAt: serverTimestamp(), updatedAt: serverTimestamp() })
}

export const updateEntry = async (uid, entryId, updates) => {
  const ref = doc(db, 'users', uid, 'entries', entryId)
  return updateDoc(ref, { ...updates, updatedAt: serverTimestamp() })
}

export const deleteEntry = async (uid, entryId) => {
  const ref = doc(db, 'users', uid, 'entries', entryId)
  return deleteDoc(ref)
}

export const getEntries = async (uid) => {
  const ref = entriesRef(uid)
  const q = query(ref, orderBy('createdAt', 'desc'))
  const snap = await getDocs(q)
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }))
}

export const getEntry = async (uid, entryId) => {
  const ref = doc(db, 'users', uid, 'entries', entryId)
  const snap = await getDoc(ref)
  if (!snap.exists()) return null
  return { id: snap.id, ...snap.data() }
}
