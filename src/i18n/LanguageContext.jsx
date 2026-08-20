import { createContext, useContext, useState, useCallback } from 'react'
import { translations } from './translations.js'

const LanguageContext = createContext(null)

const STORAGE_KEY = 'tsp.lang'

function getInitialLang() {
  if (typeof window !== 'undefined') {
    const saved = window.localStorage.getItem(STORAGE_KEY)
    if (saved === 'en' || saved === 'zh') return saved
    const nav = window.navigator.language || ''
    return nav.toLowerCase().startsWith('zh') ? 'zh' : 'en'
  }
  return 'en'
}

export function LanguageProvider({ children }) {
  const [lang, setLang] = useState(getInitialLang)

  const changeLang = useCallback((next) => {
    setLang(next)
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(STORAGE_KEY, next)
    }
    if (typeof document !== 'undefined') {
      document.documentElement.lang = next === 'zh' ? 'zh-CN' : 'en'
    }
  }, [])

  const t = useCallback(
    (key) => {
      const dict = translations[lang] || translations.en
      return dict[key] ?? key
    },
    [lang],
  )

  return (
    <LanguageContext.Provider value={{ lang, changeLang, t }}>
      {children}
    </LanguageContext.Provider>
  )
}

export function useI18n() {
  const ctx = useContext(LanguageContext)
  if (!ctx) throw new Error('useI18n must be used within LanguageProvider')
  return ctx
}
