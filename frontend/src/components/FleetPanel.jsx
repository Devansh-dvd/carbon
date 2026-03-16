import { useEffect, useState } from 'react'
import FleetVehicleDetail from './FleetVehicleDetail.jsx'
import './FleetPanel.css'

const FLEET_API  = 'http://localhost:8000/api/map/fleet'
const TYPE_ICON  = { ev: '⚡', petrol: '🔥', diesel: '⛽' }

export default function FleetPanel({ onClose }) {
  const [fleet,    setFleet]    = useState([])
  const [loading,  setLoading]  = useState(true)
  const [error,    setError]    = useState('')
  const [search,   setSearch]   = useState('')
  const [selected, setSelected] = useState(null)   // vehicle to show full detail page

  // ── Auto-fetch when panel opens ───────────────────────────
  useEffect(() => {
    setLoading(true)
    setError('')

    fetch(FLEET_API)
      .then(r => {
        if (!r.ok) throw new Error(`Server error ${r.status}`)
        return r.json()
      })
      .then(data => {
        // Handle { fleet:[...] }, { vehicles:[...] }, { data:[...] } or plain array
        const list = Array.isArray(data)
          ? data
          : data.fleet ?? data.vehicles ?? data.data ?? []
        setFleet(list)
      })
      .catch(err => {
        setError(
          err.message.includes('fetch')
            ? 'Cannot reach server at localhost:8000 — make sure the backend is running.'
            : err.message
        )
      })
      .finally(() => setLoading(false))
  }, [])

  const filtered = fleet.filter(v => {
    const q = search.toLowerCase()
    return (
      v.vehicleId?.toLowerCase().includes(q) ||
      v.vehicleType?.toLowerCase().includes(q) ||
      v.currentLocation?.address?.toLowerCase().includes(q) ||
      v.destination?.address?.toLowerCase().includes(q)
    )
  })

  // ── If a vehicle is selected, show full detail page ───────
  if (selected) {
    return (
      <FleetVehicleDetail
        vehicle={selected}
        onBack={() => setSelected(null)}
        onClose={onClose}
      />
    )
  }

  // ── Fleet list panel ──────────────────────────────────────
  return (
    <>
      <div className="fleet-overlay" onClick={onClose} />
      <aside className="fleet-panel">

        {/* ── Header ── */}
        <div className="fleet-header">
          <div>
            <p className="fleet-tag">// database · live</p>
            <h2 className="fleet-title">Fleet Overview</h2>
          </div>
          <button className="fleet-close" onClick={onClose}>✕</button>
        </div>

        {/* ── Search ── */}
        <div className="fleet-search-wrap">
          <span className="fleet-search-icon">⌕</span>
          <input
            type="text"
            className="fleet-search"
            placeholder="Search ID, type, origin, destination…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          {search && (
            <button className="fleet-search-clear" onClick={() => setSearch('')}>✕</button>
          )}
        </div>

        {/* ── Count badge ── */}
        {!loading && !error && (
          <div className="fleet-count">
            <span className="fleet-count__num">{filtered.length}</span>
            <span className="fleet-count__label">
              {filtered.length === fleet.length
                ? `vehicle${fleet.length !== 1 ? 's' : ''} in fleet`
                : `of ${fleet.length} vehicles`}
            </span>
          </div>
        )}

        {/* ── Loading ── */}
        {loading && (
          <div className="fleet-state">
            <span className="spinner-fleet" />
            <p>Fetching fleet data…</p>
          </div>
        )}

        {/* ── Error ── */}
        {error && (
          <div className="fleet-state fleet-state--error">
            <p>✕ {error}</p>
            <button
              className="fleet-retry"
              onClick={() => {
                setError('')
                setLoading(true)
                fetch(FLEET_API)
                  .then(r => r.json())
                  .then(data => {
                    const list = Array.isArray(data)
                      ? data
                      : data.fleet ?? data.vehicles ?? data.data ?? []
                    setFleet(list)
                  })
                  .catch(err => setError(err.message))
                  .finally(() => setLoading(false))
              }}
            >
              RETRY
            </button>
          </div>
        )}

        {/* ── Empty ── */}
        {!loading && !error && filtered.length === 0 && (
          <div className="fleet-state">
            <p>{search ? 'No vehicles match your search.' : 'No vehicles registered yet.'}</p>
          </div>
        )}

        {/* ── Vehicle list ── */}
        <div className="fleet-list">
          {filtered.map(v => (
            <VehicleCard
              key={v._id || v.vehicleId}
              vehicle={v}
              onClick={() => setSelected(v)}
            />
          ))}
        </div>
      </aside>
    </>
  )
}

// ── Vehicle card ──────────────────────────────────────────
function VehicleCard({ vehicle, onClick }) {
  const icon = TYPE_ICON[vehicle.vehicleType] || '🚗'
  const br   = vehicle.bestRoute

  return (
    <button className="vehicle-card" onClick={onClick}>
      {/* Top row: icon + ID + type + arrow */}
      <div className="vehicle-card__top">
        <div className="vehicle-card__icon">{icon}</div>
        <div className="vehicle-card__identity">
          <span className="vehicle-card__id">{vehicle.vehicleId}</span>
          <span className="vehicle-card__type">{vehicle.vehicleType?.toUpperCase()}</span>
        </div>
        <span className="vehicle-card__arrow">›</span>
      </div>

      {/* Route: origin → destination */}
      <div className="vehicle-card__route">
        <div className="vehicle-card__route-row">
          <span className="vc-pip vc-pip--a">A</span>
          <span className="vehicle-card__loc">{vehicle.currentLocation?.address ?? '—'}</span>
        </div>
        <div className="vc-route-connector" />
        <div className="vehicle-card__route-row">
          <span className="vc-pip vc-pip--b">B</span>
          <span className="vehicle-card__loc">{vehicle.destination?.address ?? '—'}</span>
        </div>
      </div>

      {/* Quick stats from bestRoute */}
      {br && (
        <div className="vehicle-card__stats">
          {br.distanceKm != null && <span>{br.distanceKm} km</span>}
          {br.duration               && <span>{br.duration}</span>}
          {br.engineVehicle?.co2EmittedKg != null && (
            <span className="vc-co2-warn">{br.engineVehicle.co2EmittedKg} kg CO₂</span>
          )}
          {br.evVehicle?.co2EmittedKg != null && (
            <span className="vc-co2-good">{br.evVehicle.co2EmittedKg} kg CO₂</span>
          )}
        </div>
      )}
    </button>
  )
}
