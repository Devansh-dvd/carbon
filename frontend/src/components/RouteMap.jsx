import { useEffect, useRef, useState, useCallback } from 'react'
import FleetPanel from './FleetPanel.jsx'
import './RouteMap.css'

function loadLeaflet() {
  return new Promise((resolve) => {
    if (window.L) { resolve(window.L); return }

    const link = document.createElement('link')
    link.rel = 'stylesheet'
    link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css'
    document.head.appendChild(link)

    const script = document.createElement('script')
    script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js'
    script.onload = () => resolve(window.L)
    document.head.appendChild(script)
  })
}

// Haversine distance between two [lat,lng] points in metres
function haversine([lat1, lng1], [lat2, lng2]) {
  const R = 6371000
  const toRad = d => d * Math.PI / 180
  const dLat = toRad(lat2 - lat1)
  const dLng = toRad(lng2 - lng1)
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

// Find nearest polyline index to a given [lat,lng]
function nearestIndex(latLngs, point) {
  let best = 0, bestDist = Infinity
  latLngs.forEach((ll, i) => {
    const d = haversine(ll, point)
    if (d < bestDist) { bestDist = d; best = i }
  })
  return best
}

// Total distance of a latLng array in km
function totalKm(latLngs) {
  let total = 0
  for (let i = 1; i < latLngs.length; i++)
    total += haversine(latLngs[i - 1], latLngs[i])
  return total / 1000
}

export default function RouteMap({ data, onReset }) {
  const mapRef        = useRef(null)
  const mapInstRef    = useRef(null)
  const userMarkerRef = useRef(null)
  const travelledRef  = useRef(null)
  const remainingRef  = useRef(null)
  const watchIdRef    = useRef(null)
  const followRef     = useRef(true)

  const [ready,      setReady]      = useState(false)
  const [followMode, setFollowMode] = useState(true)
  const [gpsStatus,  setGpsStatus]  = useState('idle')  // idle | requesting | active | denied | error
  const [userPos,    setUserPos]    = useState(null)     // { lat, lng, accuracy }
  const [progress,   setProgress]   = useState(0)        // 0–100
  const [distDone,   setDistDone]   = useState(0)
  const [distLeft,   setDistLeft]   = useState(null)
  const [showFleet,  setShowFleet]  = useState(false)

  const { vehicle, bestRoute } = data
  const coords       = bestRoute.geometry.coordinates
  const latLngs      = coords.map(([lng, lat]) => [lat, lng])
  const origin       = [vehicle.currentLocation.lat, vehicle.currentLocation.lng]
  const dest         = [vehicle.destination.lat, vehicle.destination.lng]
  const totalRouteKm = totalKm(latLngs)

  useEffect(() => { followRef.current = followMode }, [followMode])

  // ── Init map ──────────────────────────────────────────────
  useEffect(() => {
    loadLeaflet().then((L) => {
      if (!mapRef.current || mapInstRef.current) return

      const map = L.map(mapRef.current, { zoomControl: true }).setView(origin, 14)
      mapInstRef.current = map

      L.tileLayer(
        'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
        {
          attribution:
            '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> © <a href="https://carto.com/">CARTO</a>',
          subdomains: 'abcd',
          maxZoom: 19,
        }
      ).addTo(map)

      // Dim background full route
      L.polyline(latLngs, {
        color: '#133d13', weight: 5, opacity: 1,
      }).addTo(map)

      // Remaining segment — bright green (shrinks as user moves)
      remainingRef.current = L.polyline(latLngs, {
        color: '#39d434', weight: 5, opacity: 0.9,
        lineJoin: 'round', lineCap: 'round',
      }).addTo(map)

      // Travelled segment — dashed muted green
      travelledRef.current = L.polyline([], {
        color: '#1a5c1a', weight: 5, opacity: 0.7,
        dashArray: '6 5',
      }).addTo(map)

      // Origin marker
      L.marker(origin, {
        icon: L.divIcon({
          className: '',
          html: `<div class="map-marker map-marker--origin"><span>A</span></div>`,
          iconSize: [32, 32], iconAnchor: [16, 16],
        }),
      })
        .addTo(map)
        .bindPopup(`<b>Origin</b><br/>${vehicle.currentLocation.address}`)

      // Destination marker
      L.marker(dest, {
        icon: L.divIcon({
          className: '',
          html: `<div class="map-marker map-marker--dest"><span>B</span></div>`,
          iconSize: [32, 32], iconAnchor: [16, 16],
        }),
      })
        .addTo(map)
        .bindPopup(`<b>Destination</b><br/>${vehicle.destination.address}`)

      map.fitBounds(L.polyline(latLngs).getBounds(), { padding: [40, 40] })

      // Disable follow when user pans manually
      map.on('dragstart', () => {
        followRef.current = false
        setFollowMode(false)
      })

      setReady(true)
    })

    return () => {
      stopTrackingCleanup()
      if (mapInstRef.current) {
        mapInstRef.current.remove()
        mapInstRef.current = null
      }
    }
  }, [])

  // ── GPS position handler ──────────────────────────────────
  const handlePosition = useCallback(
    (pos) => {
      const L   = window.L
      const map = mapInstRef.current
      if (!L || !map) return

      const lat = pos.coords.latitude
      const lng = pos.coords.longitude
      const acc = pos.coords.accuracy

      setGpsStatus('active')
      setUserPos({ lat, lng, accuracy: Math.round(acc) })

      const userLL = [lat, lng]

      // Create or update user dot + accuracy circle
      if (!userMarkerRef.current) {
        userMarkerRef.current = L.marker(userLL, {
          icon: L.divIcon({
            className: '',
            html: `<div class="user-marker"><div class="user-marker__dot"></div><div class="user-marker__pulse"></div></div>`,
            iconSize: [40, 40], iconAnchor: [20, 20],
          }),
          zIndexOffset: 1000,
        }).addTo(map)

        userMarkerRef.current._accCircle = L.circle(userLL, {
          radius: acc,
          color: '#39d434',
          fillColor: '#39d434',
          fillOpacity: 0.06,
          weight: 1,
          opacity: 0.25,
        }).addTo(map)
      } else {
        userMarkerRef.current.setLatLng(userLL)
        userMarkerRef.current._accCircle?.setLatLng(userLL).setRadius(acc)
      }

      // Progress along route
      const nearIdx = nearestIndex(latLngs, userLL)
      const pct     = Math.round((nearIdx / (latLngs.length - 1)) * 100)
      const done    = parseFloat(totalKm(latLngs.slice(0, nearIdx + 1)).toFixed(2))
      const left    = parseFloat((totalRouteKm - done).toFixed(2))

      setProgress(pct)
      setDistDone(done)
      setDistLeft(left)

      // Update split polylines
      travelledRef.current?.setLatLngs(latLngs.slice(0, nearIdx + 1))
      remainingRef.current?.setLatLngs(latLngs.slice(nearIdx))

      // Auto-pan if following
      if (followRef.current) {
        map.setView(userLL, Math.max(map.getZoom(), 15), { animate: true, duration: 0.8 })
      }
    },
    [latLngs, totalRouteKm]
  )

  const handleGpsError = useCallback((err) => {
    setGpsStatus(err.code === 1 ? 'denied' : 'error')
  }, [])

  // Internal cleanup (used in useEffect return too)
  const stopTrackingCleanup = () => {
    if (watchIdRef.current != null) {
      navigator.geolocation?.clearWatch(watchIdRef.current)
      watchIdRef.current = null
    }
    if (userMarkerRef.current) {
      userMarkerRef.current._accCircle?.remove()
      userMarkerRef.current.remove()
      userMarkerRef.current = null
    }
  }

  const startTracking = useCallback(() => {
    if (!navigator.geolocation) { setGpsStatus('error'); return }
    setGpsStatus('requesting')
    watchIdRef.current = navigator.geolocation.watchPosition(
      handlePosition,
      handleGpsError,
      { enableHighAccuracy: true, maximumAge: 2000, timeout: 12000 }
    )
  }, [handlePosition, handleGpsError])

  const stopTracking = useCallback(() => {
    stopTrackingCleanup()
    setGpsStatus('idle')
    setUserPos(null)
    setProgress(0)
    setDistDone(0)
    setDistLeft(null)
    travelledRef.current?.setLatLngs([])
    remainingRef.current?.setLatLngs(latLngs)
  }, [latLngs])

  const toggleFollow = () => {
    const next = !followMode
    setFollowMode(next)
    followRef.current = next
    if (next && userPos && mapInstRef.current) {
      mapInstRef.current.setView(
        [userPos.lat, userPos.lng],
        Math.max(mapInstRef.current.getZoom(), 15),
        { animate: true }
      )
    }
  }

  const recenterRoute = () => {
    if (!mapInstRef.current || !window.L) return
    mapInstRef.current.fitBounds(
      window.L.polyline(latLngs).getBounds(),
      { padding: [40, 40], animate: true }
    )
  }

  const isTracking = gpsStatus === 'active' || gpsStatus === 'requesting'
  const isEngine   = vehicle.vehicleType === 'petrol' || vehicle.vehicleType === 'diesel'
  const isEv       = vehicle.vehicleType === 'ev'

  return (
    <div className="map-shell">

      {/* ── Fleet panel ── */}
      {showFleet && <FleetPanel onClose={() => setShowFleet(false)} />}

      {/* ── Sidebar ── */}
      <aside className="map-sidebar">
        <div className="sidebar-section">
          <p className="sidebar-tag">// live route navigation</p>
          <div className="route-title">
            <div className="route-addr">
              <span className="route-pip route-pip--a">A</span>
              <span>{vehicle.currentLocation.address}</span>
            </div>
            <div className="route-connector-line" />
            <div className="route-addr">
              <span className="route-pip route-pip--b">B</span>
              <span>{vehicle.destination.address}</span>
            </div>
          </div>
        </div>

        {/* ── GPS Controls ── */}
        <div className="sidebar-section">
          <p className="sidebar-label">Live tracking</p>
          <div className="gps-controls">
            {!isTracking ? (
              <button className="btn-gps btn-gps--start" onClick={startTracking}>
                <span className="btn-gps__icon">◎</span>
                START GPS TRACKING
              </button>
            ) : (
              <button className="btn-gps btn-gps--stop" onClick={stopTracking}>
                <span className="btn-gps__icon blink">●</span>
                STOP TRACKING
              </button>
            )}

            {gpsStatus === 'requesting' && <p className="gps-hint">Requesting location permission…</p>}
            {gpsStatus === 'denied'     && <p className="gps-hint gps-hint--error">Permission denied. Enable location in browser settings.</p>}
            {gpsStatus === 'error'      && <p className="gps-hint gps-hint--error">GPS unavailable on this device.</p>}
            {gpsStatus === 'active' && userPos && (
              <p className="gps-hint gps-hint--active">● GPS active · ±{userPos.accuracy}m accuracy</p>
            )}
          </div>

          {isTracking && (
            <div className="follow-row">
              <button
                className={`btn-follow ${followMode ? 'btn-follow--on' : ''}`}
                onClick={toggleFollow}
              >
                {followMode ? '⊙ FOLLOWING' : '○ FOLLOW ME'}
              </button>
              <button className="btn-recenter" onClick={recenterRoute} title="View full route">
                ⤢
              </button>
            </div>
          )}
        </div>

        {/* ── Progress ── */}
        {isTracking && (
          <div className="sidebar-section">
            <p className="sidebar-label">Journey progress</p>
            <div className="progress-bar-wrap">
              <div className="progress-bar">
                <div className="progress-bar__fill" style={{ width: `${progress}%` }} />
              </div>
              <span className="progress-pct">{progress}%</span>
            </div>
            <div className="stat-grid" style={{ marginTop: '0.6rem' }}>
              <StatCard label="Travelled" value={`${distDone} km`} />
              <StatCard label="Remaining" value={distLeft != null ? `${distLeft} km` : '—'} />
            </div>
          </div>
        )}

        {/* ── Route metrics ── */}
        <div className="sidebar-section">
          <p className="sidebar-label">Route metrics</p>
          <div className="stat-grid">
            <StatCard label="Distance" value={`${bestRoute.distanceKm} km`} />
            <StatCard label="Duration" value={bestRoute.duration} />
            <StatCard label="Vehicle"  value={vehicle.vehicleId} />
            <StatCard label="Type"     value={vehicle.vehicleType.toUpperCase()} />
          </div>
        </div>

        {isEngine && bestRoute.engineVehicle && (
          <div className="sidebar-section">
            <p className="sidebar-label">Engine stats</p>
            <div className="stat-grid">
              <StatCard label="Mileage"     value={`${bestRoute.engineVehicle.mileageKmpl} kmpl`} />
              <StatCard label="Fuel used"   value={`${bestRoute.engineVehicle.fuelConsumedLitres} L`} />
              <StatCard label="CO₂ emitted" value={`${bestRoute.engineVehicle.co2EmittedKg} kg`} accent="warn" />
            </div>
          </div>
        )}

        {isEv && bestRoute.evVehicle && (
          <div className="sidebar-section">
            <p className="sidebar-label">EV stats</p>
            <div className="stat-grid">
              <StatCard label="Total range" value={`${bestRoute.evVehicle.totalRangeKm} km`} />
              <StatCard label="After trip"  value={`${bestRoute.evVehicle.rangeAfterTrip} km`} />
              <StatCard label="CO₂ emitted" value={`${bestRoute.evVehicle.co2EmittedKg} kg`} accent="good" />
              <StatCard
                label="Sufficient"
                value={bestRoute.evVehicle.isSufficient ? 'YES' : 'NO'}
                accent={bestRoute.evVehicle.isSufficient ? 'good' : 'warn'}
              />
            </div>
          </div>
        )}

        {bestRoute.comparison && (
          <div className="sidebar-section">
            <p className="sidebar-label">Comparison</p>
            <div className="stat-grid">
              <StatCard label="CO₂ saved"    value={`${bestRoute.comparison.co2SavedKg} kg`} accent="good" />
              <StatCard label="Trees equiv." value={`${bestRoute.comparison.treesEquivalent}`} />
            </div>
          </div>
        )}

        <button className="btn-fleet" onClick={() => setShowFleet(true)}>
          ◈ FLEET OVERVIEW
        </button>

        <button className="btn-new-route" onClick={onReset}>
          ← Plan New Route
        </button>
      </aside>

      {/* ── Map ── */}
      <div className="map-area">
        {!ready && (
          <div className="map-loading">
            <span className="spinner-large" />
            <p>Loading map...</p>
          </div>
        )}
        <div ref={mapRef} className="map-container" />
      </div>
    </div>
  )
}

function StatCard({ label, value, accent }) {
  return (
    <div className={`stat-card ${accent ? `stat-card--${accent}` : ''}`}>
      <span className="stat-label">{label}</span>
      <span className="stat-value">{value}</span>
    </div>
  )
}
