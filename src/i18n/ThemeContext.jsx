import { createContext, useContext, useState, useEffect, useCallback } from 'react'

const ThemeContext = createContext(null)
const STORAGE_KEY = 'tsp.theme'

function getInitial() {
  if (typeof window === 'undefined') return 'auto'
  const saved = window.localStorage.getItem(STORAGE_KEY)
  if (saved === 'light' || saved === 'dark' || saved === 'auto') return saved
  return 'auto'
}

function prefersDark() {
  if (typeof window === 'undefined' || !window.matchMedia) return false
  return window.matchMedia('(prefers-color-scheme: dark)').matches
}

// Resolve the theme that is actually displayed right now.
function effectiveTheme(mode) {
  return mode === 'auto' ? (prefersDark() ? 'dark' : 'light') : mode
}

function apply(mode) {
  if (typeof document === 'undefined') return
  const root = document.documentElement
  if (mode === 'auto') root.removeAttribute('data-theme')
  else root.setAttribute('data-theme', mode)
}

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(getInitial)

  // Apply on mount + whenever mode changes.
  useEffect(() => {
    apply(theme)
  }, [theme])

  // When in auto, follow system changes live.
  useEffect(() => {
    if (theme !== 'auto' || !window.matchMedia) return
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const onChange = () => apply('auto')
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [theme])

  const setMode = useCallback((next) => {
    setTheme(next)
    if (typeof window !== 'undefined') window.localStorage.setItem(STORAGE_KEY, next)
  }, [])

  // Cycle: auto -> dark -> light -> auto
  const toggle = useCallback(() => {
    setTheme((cur) => {
      const next = cur === 'auto' ? 'dark' : cur === 'dark' ? 'light' : 'auto'
      if (typeof window !== 'undefined') window.localStorage.setItem(STORAGE_KEY, next)
      return next
    })
  }, [])

  return (
    <ThemeContext.Provider value={{ theme, setMode, toggle, effectiveTheme: effectiveTheme(theme) }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  const ctx = useContext(ThemeContext)
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider')
  return ctx
}
