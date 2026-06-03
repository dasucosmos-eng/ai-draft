import { initializeApp, getApps, getApp } from 'firebase/app'
import { getAuth } from 'firebase/auth'

const firebaseConfig = {
  apiKey: 'AIzaSyD9Mjsf2BQsHgJevcJ-Dxa3zeVzx13DFqI',
  authDomain: 'ai-draft-39e32.firebaseapp.com',
  projectId: 'ai-draft-39e32',
  storageBucket: 'ai-draft-39e32.firebasestorage.app',
  messagingSenderId: '304044927721',
  appId: '1:304044927721:web:00133926da4b752e579e78',
  measurementId: 'G-39HS888095',
}

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp()
const auth = getAuth(app)

export { app, auth }
