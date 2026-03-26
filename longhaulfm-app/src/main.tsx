// src/main.tsx
import React from 'react'
import ReactDOM from 'react-dom/client'
import './i18n/config'  // ← add this line before App
import App from './App'
import './styles/globals.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
