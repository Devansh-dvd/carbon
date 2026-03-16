import { useState } from 'react'
import './RoutePlannerForm.css'

const VEHICLE_TYPES = [
  { id: 'ev',     label: 'Electric',  icon: '⚡', desc: 'Battery powered' },
  { id: 'petrol', label: 'Petrol',    icon: '🔥', desc: 'Gasoline engine' },
  { id: 'diesel', label: 'Diesel',    icon: '⛽', desc: 'Diesel engine'   },
]

const initialState = {
  vehicleId:       '',
  vehicleType:     '',
  currentLocation: '',
  destination:     '',
  mileage:         '',
  mileageUnit:     'kmpl',
  distanceRange:   '',
  rangeUnit:       'km',
}

const API_URL = 'http://localhost:8000/api/map/register'

export default function RoutePlannerForm({ onSuccess }) {
  const [form, setForm]         = useState(initialState)
  const [errors, setErrors]     = useState({})
  const [loading, setLoading]   = useState(false)
  const [apiError, setApiError] = useState('')

  const set = (key, value) => {
    setForm(prev => ({ ...prev, [key]: value }))
    if (errors[key]) setErrors(prev => ({ ...prev, [key]: '' }))
    if (apiError) setApiError('')
  }

  const validate = () => {
    const e = {}
    if (!form.vehicleId.trim())       e.vehicleId       = 'Vehicle ID is required'
    if (!form.vehicleType)            e.vehicleType     = 'Select a vehicle type'
    if (!form.currentLocation.trim()) e.currentLocation = 'Current location is required'
    if (!form.destination.trim())     e.destination     = 'Destination is required'
    if ((form.vehicleType === 'petrol' || form.vehicleType === 'diesel') && form.mileage && isNaN(Number(form.mileage)))
      e.mileage = 'Must be a number'
    if (form.vehicleType === 'ev' && form.distanceRange && isNaN(Number(form.distanceRange)))
      e.distanceRange = 'Must be a number'
    return e
  }

  const buildPayload = () => {
    const result = {
      vehicleId:       form.vehicleId.trim(),
      vehicleType:     form.vehicleType,
      currentLocation: { address: form.currentLocation.trim() },
      destination:     { address: form.destination.trim() },
    }
    if (form.vehicleType === 'petrol' || form.vehicleType === 'diesel') {
      result.engineVehicle = {
        ...(form.mileage ? { mileage: Number(form.mileage) } : {}),
        unit: form.mileageUnit,
      }
    }
    if (form.vehicleType === 'ev') {
      result.evVehicle = {
        ...(form.distanceRange ? { distanceRange: Number(form.distanceRange) } : {}),
        unit: form.rangeUnit,
      }
    }
    return result
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    const errs = validate()
    if (Object.keys(errs).length > 0) { setErrors(errs); return }

    const body = buildPayload()
    setLoading(true)
    setApiError('')

    try {
      const res = await fetch(API_URL, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(body),
      })

      const data = await res.json().catch(() => null)

      if (!res.ok) {
        const msg = data?.message || data?.error || `Server error ${res.status}`
        setApiError(msg)
        setLoading(false)
        return
      }

      onSuccess(data)
    } catch (err) {
      setApiError(
        err.message.includes('fetch')
          ? 'Cannot reach server at localhost:8000 — make sure the backend is running.'
          : err.message
      )
    } finally {
      setLoading(false)
    }
  }

  const handleReset = () => {
    setForm(initialState)
    setErrors({})
    setLoading(false)
    setApiError('')
  }

  return (
    <form className="planner-form" onSubmit={handleSubmit} noValidate>

      {/* ── Section 1: Vehicle Identity ── */}
      <FormSection index="01" label="Vehicle Identity">
        <div className="field-row">
          <FormField label="Vehicle ID" error={errors.vehicleId} required>
            <input
              type="text"
              className={`input ${errors.vehicleId ? 'input--error' : ''}`}
              placeholder="e.g. VH-00421"
              value={form.vehicleId}
              onChange={e => set('vehicleId', e.target.value)}
            />
          </FormField>
        </div>

        <div className="type-label">
          Vehicle type <span className="req">*</span>
          {errors.vehicleType && <span className="field-error">{errors.vehicleType}</span>}
        </div>
        <div className="vtype-grid">
          {VEHICLE_TYPES.map(vt => (
            <button
              key={vt.id}
              type="button"
              className={`vtype-btn ${form.vehicleType === vt.id ? 'vtype-btn--active' : ''}`}
              onClick={() => set('vehicleType', vt.id)}
            >
              <span className="vtype-icon">{vt.icon}</span>
              <span className="vtype-label">{vt.label}</span>
              <span className="vtype-desc">{vt.desc}</span>
            </button>
          ))}
        </div>
      </FormSection>

      {/* ── Section 2: Route ── */}
      <FormSection index="02" label="Route">
        <div className="route-stack">
          <FormField label="Current Location" error={errors.currentLocation} required>
            <div className="route-input-wrap">
              <span className="route-pip route-pip--origin" />
              <input
                type="text"
                className={`input input--route ${errors.currentLocation ? 'input--error' : ''}`}
                placeholder="City, address or landmark"
                value={form.currentLocation}
                onChange={e => set('currentLocation', e.target.value)}
              />
            </div>
          </FormField>

          <div className="route-connector">
            <span className="route-line" />
            <span className="route-arrow">↓</span>
            <span className="route-line" />
          </div>

          <FormField label="Destination" error={errors.destination} required>
            <div className="route-input-wrap">
              <span className="route-pip route-pip--dest" />
              <input
                type="text"
                className={`input input--route ${errors.destination ? 'input--error' : ''}`}
                placeholder="City, address or landmark"
                value={form.destination}
                onChange={e => set('destination', e.target.value)}
              />
            </div>
          </FormField>
        </div>
      </FormSection>

      {/* ── Section 3: Engine specs (conditional) ── */}
      {(form.vehicleType === 'petrol' || form.vehicleType === 'diesel') && (
        <FormSection index="03" label="Engine Specs" tag="optional">
          <div className="field-row-2">
            <FormField label="Mileage" error={errors.mileage}>
              <input
                type="number"
                className={`input ${errors.mileage ? 'input--error' : ''}`}
                placeholder="e.g. 15"
                min="0"
                value={form.mileage}
                onChange={e => set('mileage', e.target.value)}
              />
            </FormField>
            <FormField label="Unit">
              <select
                className="input select"
                value={form.mileageUnit}
                onChange={e => set('mileageUnit', e.target.value)}
              >
                <option value="kmpl">kmpl</option>
                <option value="mpg">mpg</option>
              </select>
            </FormField>
          </div>
        </FormSection>
      )}

      {/* ── Section 3: EV specs (conditional) ── */}
      {form.vehicleType === 'ev' && (
        <FormSection index="03" label="EV Specs" tag="optional">
          <div className="field-row-2">
            <FormField label="Distance Range" error={errors.distanceRange}>
              <input
                type="number"
                className={`input ${errors.distanceRange ? 'input--error' : ''}`}
                placeholder="e.g. 400"
                min="0"
                value={form.distanceRange}
                onChange={e => set('distanceRange', e.target.value)}
              />
            </FormField>
            <FormField label="Unit">
              <select
                className="input select"
                value={form.rangeUnit}
                onChange={e => set('rangeUnit', e.target.value)}
              >
                <option value="km">km</option>
                <option value="miles">miles</option>
              </select>
            </FormField>
          </div>
        </FormSection>
      )}

      {/* ── API Error ── */}
      {apiError && (
        <div className="api-error">
          <span className="api-error__icon">✕</span>
          <span className="api-error__msg">{apiError}</span>
        </div>
      )}

      {/* ── Submit ── */}
      <div className="form-actions">
        <button type="submit" className="btn-submit" disabled={loading}>
          {loading
            ? <><span className="spinner" /><span>SENDING...</span></>
            : <><span className="btn-submit__prefix">▶</span><span>EXECUTE ROUTE PLAN</span></>
          }
        </button>
        <button type="button" className="btn-reset" onClick={handleReset} disabled={loading}>
          CLEAR
        </button>
      </div>
    </form>
  )
}

/* ── Sub-components ── */

function FormSection({ index, label, tag, children }) {
  return (
    <section className="form-section">
      <div className="section-header">
        <span className="section-index">{index}</span>
        <span className="section-label">{label}</span>
        {tag && <span className="section-tag">{tag}</span>}
        <span className="section-line" />
      </div>
      <div className="section-body">{children}</div>
    </section>
  )
}

function FormField({ label, error, required, children }) {
  return (
    <div className="form-field">
      <label className="field-label">
        {label}
        {required && <span className="req"> *</span>}
      </label>
      {children}
      {error && <p className="field-error">{error}</p>}
    </div>
  )
}

function SuccessPanel({ payload, response, onReset }) {
  const sentJson = JSON.stringify(payload, null, 2)
  const resJson  = JSON.stringify(response, null, 2)
  const [copied, setCopied] = useState(false)

  const copy = () => {
    navigator.clipboard.writeText(sentJson).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  return (
    <div className="success-panel">
      <div className="success-header">
        <div className="success-icon">✓</div>
        <div>
          <h2 className="success-title">Request Successful</h2>
          <p className="success-sub">
            {payload.currentLocation.address} → {payload.destination.address}
          </p>
        </div>
      </div>

      <div className="success-meta" style={{ marginBottom: '1rem' }}>
        <MetaChip label="VEHICLE" value={payload.vehicleId} />
        <MetaChip label="TYPE"    value={payload.vehicleType.toUpperCase()} />
        {payload.engineVehicle?.mileage && (
          <MetaChip label="MILEAGE" value={`${payload.engineVehicle.mileage} ${payload.engineVehicle.unit}`} />
        )}
        {payload.evVehicle?.distanceRange && (
          <MetaChip label="RANGE" value={`${payload.evVehicle.distanceRange} ${payload.evVehicle.unit}`} />
        )}
      </div>

      <div className="payload-block" style={{ marginBottom: '1rem' }}>
        <div className="payload-toolbar">
          <span className="payload-label font-mono">▶ SENT PAYLOAD</span>
          <button className="btn-copy" onClick={copy}>
            {copied ? '✓ COPIED' : 'COPY JSON'}
          </button>
        </div>
        <pre className="payload-json">{sentJson}</pre>
      </div>

      {response && (
        <div className="payload-block" style={{ marginBottom: '1rem' }}>
          <div className="payload-toolbar">
            <span className="payload-label font-mono">◀ SERVER RESPONSE</span>
          </div>
          <pre className="payload-json payload-json--response">{resJson}</pre>
        </div>
      )}

      <button className="btn-submit" onClick={onReset}>
        <span className="btn-submit__prefix">↺</span>
        <span>PLAN ANOTHER ROUTE</span>
      </button>
    </div>
  )
}

function MetaChip({ label, value }) {
  return (
    <div className="meta-chip">
      <span className="meta-chip__label">{label}</span>
      <span className="meta-chip__value">{value}</span>
    </div>
  )
}
