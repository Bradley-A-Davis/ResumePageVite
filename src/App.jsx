import { useState } from 'react'
import Egg from './assets/pages/egg.jsx'
import Home from './assets/pages/Home.jsx'

function App() {
  const [showEgg, setShowEgg] = useState(false)

  if (showEgg) {
    return <Egg />
  }

  return <Home onScrollUpComplete={() => setShowEgg(true)} />
}

export default App
