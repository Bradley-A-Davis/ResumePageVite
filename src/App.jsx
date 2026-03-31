import { useEffect, useState } from 'react'
import Home from './assets/pages/Home.jsx'
import Imposter from './assets/pages/imposter.jsx'
import Bow from './assets/pages/Bow.jsx'
import PageGallery from './assets/pages/PageGallery.jsx'
import Projects from './assets/pages/projects.jsx'

const getCurrentPath = () => window.location.pathname || '/'

const navigateTo = (path, replace = false) => {
  if (window.location.pathname === path) return
  const method = replace ? 'replaceState' : 'pushState'
  window.history[method]({}, '', path)
}

function App() {
  const [path, setPath] = useState(getCurrentPath)
  const [switchPending, setSwitchPending] = useState(false)

  useEffect(() => {
    const handlePopState = () => {
      setPath(getCurrentPath())
      setSwitchPending(false)
    }

    window.addEventListener('popstate', handlePopState)
    return () => window.removeEventListener('popstate', handlePopState)
  }, [])

  const handleNavigate = (nextPath) => {
    navigateTo(nextPath)
    setPath(nextPath)
    setSwitchPending(false)
  }

  if (path === '/imposter') {
    return (
      <Imposter
        onFlashComplete={() => {
          navigateTo('/')
          setPath('/')
          setSwitchPending(false)
        }}
      />
    )
  }

  if (path === '/') {
    return (
      <Home
        onScrollUpComplete={() => {
          if (switchPending) return
          setSwitchPending(true)
          navigateTo('/projects')
          setPath('/projects')
        }}
        onScrollDownComplete={() => {
          if (switchPending) return
          setSwitchPending(true)
          navigateTo('/gallery')
          setPath('/gallery')
        }}
      />
    )
  }

  if (path === '/bow') {
    return <Bow />
  }

  if (path === '/gallery') {
    return <PageGallery onNavigate={handleNavigate} />
  }

  if (path === '/projects') {
    return <Projects />
  }

  return <Home onScrollDownComplete={() => {}} />
}

export default App
