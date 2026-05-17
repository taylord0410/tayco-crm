'use client'

import { useState } from 'react'

const TRADES = ['Cleaning','Drywall','Painting','HVAC','Concrete','Masonry','Flooring','Tile','Roofing','Insulation','Windows','Glass Installation','Demolition','Waterproofing','Sealants','Steel Erection','Welding','Fire Protection','Sprinklers','Other']

export default function Registro() {
  const [form, setForm] = useState({
    businessName: '',
    contactName: '',
    contactEmail: '',
    contactPhone: '',
    crewSize: '',
    yearsExperience: '',
    trades: [] as string[],
    citiesServed: '',
    generalNotes: '',
  })
  const [submitted, setSubmitted] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  function set(key: string, val: unknown) {
    setForm(p => ({ ...p, [key]: val }))
  }

  function toggleTrade(trade: string) {
    setForm(p => ({
      ...p,
      trades: p.trades.includes(trade)
        ? p.trades.filter(t => t !== trade)
        : [...p.trades, trade],
    }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError('')
    try {
      const fields: Record<string, unknown> = {
        'Business Name':          form.businessName,
        'Primary Contact Name':   form.contactName,
        'Contact Email':          form.contactEmail,
        'Contact Phone':          form.contactPhone,
        'Crew Size':              form.crewSize ? Number(form.crewSize) : undefined,
        'Types of Work/Trades':   form.trades,
        'Cities Served':          form.citiesServed,
        'General Notes':          form.yearsExperience ? `Years of experience: ${form.yearsExperience}. ${form.generalNotes}` : form.generalNotes,
        'Approval Status':        'Pending',
      }
      const res = await fetch('/api/airtable', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tab: 'contractors', fields }),
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
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Thank you!</h2>
          <p className="text-gray-500">Your information has been submitted successfully. We will be in touch soon.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-10 px-4">
      <div className="max-w-2xl mx-auto">

        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-14 h-14 rounded-xl bg-blue-600 flex items-center justify-center text-white font-bold text-2xl mx-auto mb-4">T</div>
          <h1 className="text-3xl font-bold text-gray-900">Join Our Network</h1>
          <p className="text-gray-500 mt-2">Fill out the form below to register as a subcontractor with Tayco LLC.</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8 flex flex-col gap-6">

          {/* Business Info */}
          <div>
            <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4">Business Information</h3>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Business Name <span className="text-red-500">*</span></label>
                <input required type="text" placeholder="Your company name"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={form.businessName} onChange={e => set('businessName', e.target.value)} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Years of Experience <span className="text-red-500">*</span></label>
                <input required type="number" min="0" placeholder="e.g. 5"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={form.yearsExperience} onChange={e => set('yearsExperience', e.target.value)} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Crew Size</label>
                <input type="number" min="1" placeholder="Number of workers"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={form.crewSize} onChange={e => set('crewSize', e.target.value)} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Cities Served <span className="text-red-500">*</span></label>
                <input required type="text" placeholder="e.g. Los Angeles, San Diego"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={form.citiesServed} onChange={e => set('citiesServed', e.target.value)} />
              </div>
            </div>
          </div>

          {/* Contact Info */}
          <div>
            <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4">Contact Information</h3>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Full Name <span className="text-red-500">*</span></label>
                <input required type="text" placeholder="Your full name"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={form.contactName} onChange={e => set('contactName', e.target.value)} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number <span className="text-red-500">*</span></label>
                <input required type="tel" placeholder="+1 (555) 000-0000"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={form.contactPhone} onChange={e => set('contactPhone', e.target.value)} />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Email Address</label>
                <input type="email" placeholder="your@email.com"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={form.contactEmail} onChange={e => set('contactEmail', e.target.value)} />
              </div>
            </div>
          </div>

          {/* Trades */}
          <div>
            <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4">Types of Work / Trades <span className="text-red-500">*</span></h3>
            <div className="flex flex-wrap gap-2">
              {TRADES.map(trade => (
                <button key={trade} type="button" onClick={() => toggleTrade(trade)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-all ${
                    form.trades.includes(trade)
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'bg-white text-gray-600 border-gray-300 hover:border-blue-400'
                  }`}
                >{trade}</button>
              ))}
            </div>
            {form.trades.length === 0 && <p className="text-xs text-gray-400 mt-2">Select at least one trade</p>}
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Additional Information</label>
            <textarea rows={3} placeholder="Any additional information about your business, certifications, equipment, etc."
              className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={form.generalNotes} onChange={e => set('generalNotes', e.target.value)} />
          </div>

          {error && <p className="text-red-600 text-sm text-center">{error}</p>}

          <button type="submit" disabled={saving || form.trades.length === 0}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-semibold py-3 rounded-xl transition-colors text-base">
            {saving ? 'Submitting...' : 'Submit Application'}
          </button>

          <p className="text-xs text-gray-400 text-center">By submitting this form, you agree to be contacted by Tayco LLC regarding subcontracting opportunities.</p>
        </form>
      </div>
    </div>
  )
}
