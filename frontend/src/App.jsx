import { useState } from 'react'
import RoutePlannerForm from './components/RoutePlannerForm.jsx'
import RouteMap from './components/RouteMap.jsx'
import './App.css'

export default function App() {
  const [routeData, setRouteData] = useState(null)

  const handleRouteSuccess = (data) => {
    setRouteData(data)
  }

  const handleReset = () => {
    setRouteData(null)
  }

  return (
    <div className="app-shell">
      <header className="app-header">
        <div className="header-inner">
          <div className="logo">
            <span className="logo-bracket">[</span>
            <span className="logo-text">ROUTE</span>
            <span className="logo-accent">IQ</span>
            <span className="logo-bracket">]</span>
          </div>
          <div className="header-meta">
            {routeData && (
              <button className="btn-back" onClick={handleReset}>
                ← NEW ROUTE
              </button>
            )}
            <span className="status-dot" />
            <span className="status-text">SYSTEM ONLINE</span>
          </div>
        </div>
      </header>

      <main className={`app-main ${routeData ? 'app-main--map' : ''}`}>
        {!routeData ? (
          <>
            <div className="hero">
              <p className="hero-tag">// smart route intelligence</p>
              <h1 className="hero-title">Plan Your Route</h1>
              <p className="hero-sub">
                Enter your vehicle details and destination — we'll calculate the optimal path.
              </p>
            </div>
            <RoutePlannerForm onSuccess={handleRouteSuccess} />
          </>
        ) : (
          <RouteMap data={routeData} onReset={handleReset} />
        )}
      </main>

      <footer className="app-footer">
        <span className="font-mono">RouteIQ v1.0.0</span>
        <span>·</span>
        <span>All systems operational</span>
      </footer>
    </div>
  )
}
