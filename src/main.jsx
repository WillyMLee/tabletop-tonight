import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { ConvexProvider, ConvexReactClient } from 'convex/react'
import App from './App.jsx'
import './styles.css'

const convexUrl = import.meta.env.VITE_CONVEX_URL
const application = convexUrl ? (
  <ConvexProvider client={new ConvexReactClient(convexUrl)}>
    <App realtime />
  </ConvexProvider>
) : <App />

createRoot(document.getElementById('root')).render(
  <StrictMode>
    {application}
  </StrictMode>,
)
