import './FleetVehicleDetail.css'

const TYPE_ICON  = { ev: '⚡', petrol: '🔥', diesel: '⛽' }
const TYPE_LABEL = { ev: 'Electric', petrol: 'Petrol', diesel: 'Diesel' }

export default function FleetVehicleDetail({ vehicle, onBack, onClose }) {
  const { bestRoute, routes = [] } = vehicle
  const isEngine = vehicle.vehicleType === 'petrol' || vehicle.vehicleType === 'diesel'
  const isEv     = vehicle.vehicleType === 'ev'

  return (
    <>
      <div className="fvd-overlay" onClick={onClose} />
      <div className="fvd-page">

        {/* ── Top bar ── */}
        <div className="fvd-topbar">
          <button className="fvd-back" onClick={onBack}>
            ← Back to Fleet
          </button>
          <button className="fvd-close" onClick={onClose}>✕</button>
        </div>

        {/* ── Hero ── */}
        <div className="fvd-hero">
          <div className="fvd-hero-icon">{TYPE_ICON[vehicle.vehicleType] || '🚗'}</div>
          <div className="fvd-hero-info">
            <h1 className="fvd-vehicle-id">{vehicle.vehicleId}</h1>
            <div className="fvd-badge-row">
              <span className="fvd-badge fvd-badge--type">
                {TYPE_LABEL[vehicle.vehicleType] || vehicle.vehicleType}
              </span>
              {vehicle.totalRoutes != null && (
                <span className="fvd-badge">
                  {vehicle.totalRoutes} route{vehicle.totalRoutes !== 1 ? 's' : ''}
                </span>
              )}
              {vehicle.createdAt && (
                <span className="fvd-badge fvd-badge--dim">
                  Registered {new Date(vehicle.createdAt).toLocaleDateString('en-IN', {
                    day: '2-digit', month: 'short', year: 'numeric',
                  })}
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="fvd-body">

          {/* ── Route ── */}
          <Section label="Route">
            <div className="fvd-route">
              <div className="fvd-route-row">
                <span className="fvd-pip fvd-pip--a">A</span>
                <div>
                  <p className="fvd-addr">{vehicle.currentLocation?.address}</p>
                  {vehicle.currentLocation?.lat != null && (
                    <p className="fvd-coords">
                      {vehicle.currentLocation.lat.toFixed(6)},&nbsp;
                      {vehicle.currentLocation.lng.toFixed(6)}
                    </p>
                  )}
                </div>
              </div>
              <div className="fvd-route-line" />
              <div className="fvd-route-row">
                <span className="fvd-pip fvd-pip--b">B</span>
                <div>
                  <p className="fvd-addr">{vehicle.destination?.address}</p>
                  {vehicle.destination?.lat != null && (
                    <p className="fvd-coords">
                      {vehicle.destination.lat.toFixed(6)},&nbsp;
                      {vehicle.destination.lng.toFixed(6)}
                    </p>
                  )}
                </div>
              </div>
            </div>
          </Section>

          {/* ── Best route summary ── */}
          {bestRoute && (
            <Section label={`Best route · index #${bestRoute.routeIndex}`}>
              <div className="fvd-grid">
                <StatBox label="Distance"    value={bestRoute.distanceKm}           unit="km"  />
                <StatBox label="Duration"    value={bestRoute.duration}              unit=""    />
                <StatBox label="Duration"    value={bestRoute.durationSeconds?.toFixed(0)} unit="sec" />
              </div>
            </Section>
          )}

          {/* ── Engine stats ── */}
          {isEngine && bestRoute?.engineVehicle && (
            <Section label="Engine stats">
              <div className="fvd-grid">
                <StatBox label="Mileage"     value={bestRoute.engineVehicle.mileageKmpl}        unit="kmpl" />
                <StatBox label="Fuel used"   value={bestRoute.engineVehicle.fuelConsumedLitres}  unit="L"    />
                <StatBox label="CO₂ emitted" value={bestRoute.engineVehicle.co2EmittedKg}        unit="kg"   accent="warn" />
              </div>
            </Section>
          )}

          {/* ── EV stats ── */}
          {isEv && bestRoute?.evVehicle && (
            <Section label="EV stats">
              <div className="fvd-grid">
                <StatBox label="Total range"  value={bestRoute.evVehicle.totalRangeKm}   unit="km" />
                <StatBox label="After trip"   value={bestRoute.evVehicle.rangeAfterTrip} unit="km" />
                <StatBox label="CO₂ emitted"  value={bestRoute.evVehicle.co2EmittedKg}   unit="kg" accent="good" />
                <StatBox
                  label="Range sufficient"
                  value={bestRoute.evVehicle.isSufficient ? 'YES' : 'NO'}
                  unit=""
                  accent={bestRoute.evVehicle.isSufficient ? 'good' : 'warn'}
                />
              </div>
            </Section>
          )}

          {/* ── Environmental comparison ── */}
          {bestRoute?.comparison && (
            <Section label="Environmental comparison">
              <div className="fvd-grid">
                <StatBox label="CO₂ saved"    value={bestRoute.comparison.co2SavedKg}      unit="kg" accent="good" />
                <StatBox label="Trees equiv." value={bestRoute.comparison.treesEquivalent} unit=""   />
              </div>
            </Section>
          )}

          {/* ── All routes ── */}
          {routes.length > 0 && (
            <Section label={`All routes (${routes.length})`}>
              <div className="fvd-routes-list">
                {routes.map((r, i) => {
                  const isBest = r.routeIndex === bestRoute?.routeIndex
                  return (
                    <div key={i} className={`fvd-route-item ${isBest ? 'fvd-route-item--best' : ''}`}>
                      <div className="fvd-route-item__left">
                        <span className="fvd-route-item__idx">Route #{r.routeIndex}</span>
                        {isBest && <span className="fvd-best-tag">BEST</span>}
                      </div>
                      <div className="fvd-route-item__right">
                        {r.distanceKm != null && <span>{r.distanceKm} km</span>}
                        {r.duration             && <span>{r.duration}</span>}
                      </div>
                    </div>
                  )
                })}
              </div>
            </Section>
          )}

          {/* ── Timestamps ── */}
          {(vehicle.createdAt || vehicle.updatedAt) && (
            <div className="fvd-timestamps">
              {vehicle.createdAt && (
                <span>Created: {new Date(vehicle.createdAt).toLocaleString('en-IN')}</span>
              )}
              {vehicle.updatedAt && (
                <span>Updated: {new Date(vehicle.updatedAt).toLocaleString('en-IN')}</span>
              )}
            </div>
          )}

        </div>
      </div>
    </>
  )
}

function Section({ label, children }) {
  return (
    <div className="fvd-section">
      <p className="fvd-section-label">{label}</p>
      {children}
    </div>
  )
}

function StatBox({ label, value, unit, accent }) {
  return (
    <div className={`fvd-statbox ${accent ? `fvd-statbox--${accent}` : ''}`}>
      <span className="fvd-statbox__label">{label}</span>
      <span className="fvd-statbox__value">
        {value ?? '—'}
        {unit && value != null && <span className="fvd-statbox__unit"> {unit}</span>}
      </span>
    </div>
  )
}
