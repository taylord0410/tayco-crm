'use client'

import { useState } from 'react'

const WORK_TYPES = ['Cleaning','Drywall','Painting','HVAC','Concrete','Masonry','Flooring','Tile','Roofing','Insulation','Windows','Demolition','Waterproofing','Fire Protection','Other']

export default function EstimadoPage() {
  const [form, setForm] = useState({
    contactName: '',
    contactPhone: '',
    contactEmail: '',
    companyName: '',
    city: '',
    workType: '',
    description: '',
  })
  const [submitted, setSubmitted] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  function set(key: string, val: string) {
    setForm(p => ({ ...p, [key]: val }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError('')
    try {
      const notes = [
        'TYPE: Estimate Request',
        form.workType   ? `Work Type: ${form.workType}`     : '',
        form.city       ? `City: ${form.city}`               : '',
        form.description? `Description: ${form.description}` : '',
      ].filter(Boolean).join('\n')

      const fields: Record<string, unknown> = {
        'Primary Contact Name': form.contactName,
        'Contact Phone':        form.contactPhone,
        'Contact Email':        form.contactEmail,
        'Company Name':         form.companyName || form.contactName,
        'Lead Notes':           notes,
        'status':               'Pending',
      }

      const res = await fetch('/api/airtable', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tab: 'estimates', fields }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setSubmitted(true)
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setSaving(false)
    }
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-lg p-10 max-w-md w-full text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Request Received!</h2>
          <p className="text-gray-500 mt-2">Thank you for contacting Tayco LLC. We will review your request and get back to you shortly.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-10 px-4">
      <div className="max-w-xl mx-auto">

        <div className="text-center mb-8">
          <img src="/logo.jpeg" alt="Tayco LLC" className="h-20 w-20 rounded-xl object-contain mx-auto mb-4" />
          <h1 className="text-3xl font-bold text-gray-900">Request an Estimate</h1>
          <p className="text-gray-500 mt-2">Fill out the form below and our team will contact you soon.</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8 flex flex-col gap-6">

          <div>
            <h3 className="text-sm font-semibold text-blue-600 uppercase tracking-wider mb-4 pb-2 border-b border-gray-100">Contact Information</h3>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Full Name <span className="text-red-500">*</span></label>
                <input required type="text" placeholder="Your full name"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={form.contactName} onChange={e => set('contactName', e.target.value)} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Phone <span className="text-red-500">*</span></label>
                <input required type="tel" placeholder="+1 (555) 000-0000"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={form.contactPhone} onChange={e => set('contactPhone', e.target.value)} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input type="email" placeholder="your@email.com"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={form.contactEmail} onChange={e => set('contactEmail', e.target.value)} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Company / Property Name</label>
                <input type="text" placeholder="Optional"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={form.companyName} onChange={e => set('companyName', e.target.value)} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">City <span className="text-red-500">*</span></label>
                <input required type="text" placeholder="e.g. Los Angeles"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={form.city} onChange={e => set('city', e.target.value)} />
              </div>
            </div>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-blue-600 uppercase tracking-wider mb-4 pb-2 border-b border-gray-100">Project Details</h3>
            <div className="flex flex-col gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Type of Work <span className="text-red-500">*</span></label>
                <select required
                  className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={form.workType} onChange={e => set('workType', e.target.value)}>
                  <option value="">Select a type...</option>
                  {WORK_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description <span className="text-red-500">*</span></label>
                <textarea required rows={4} placeholder="Describe the work you need done..."
                  className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={form.description} onChange={e => set('description', e.target.value)} />
              </div>
            </div>
          </div>

          {error && <p className="text-red-600 text-sm text-center bg-red-50 p-3 rounded-lg">{error}</p>}

          <button type="submit" disabled={saving}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white font-semibold py-3.5 rounded-xl transition-colors text-base">
            {saving ? 'Sending...' : 'Request Estimate'}
          </button>

          <p className="text-xs text-gray-400 text-center">By submitting this form you agree to be contacted by Tayco LLC.</p>
        </form>
      </div>
    </div>
  )
}
