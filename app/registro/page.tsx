'use client'

import { useState, useRef } from 'react'

const TRADES = ['Cleaning','Drywall','Painting','HVAC','Concrete','Masonry','Flooring','Tile','Roofing','Insulation','Windows','Glass Installation','Demolition','Waterproofing','Sealants','Steel Erection','Welding','Fire Protection','Sprinklers','Other']

function FileUpload({ label, name, accept, onChange }: { label: string; name: string; accept: string; onChange: (file: File | null) => void }) {
  const ref = useRef<HTMLInputElement>(null)
  const [fileName, setFileName] = useState('')

  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      <div
        onClick={() => ref.current?.click()}
        className="border-2 border-dashed border-gray-300 rounded-xl p-5 text-center cursor-pointer hover:border-blue-400 hover:bg-blue-50 transition-colors"
      >
        {fileName ? (
          <div className="flex items-center justify-center gap-2 text-green-600">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
            <span className="text-sm font-medium">{fileName}</span>
          </div>
        ) : (
          <div className="text-gray-400">
            <svg className="w-8 h-8 mx-auto mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
            <p className="text-sm">Click to upload <span className="text-blue-500 font-medium">{label}</span></p>
            <p className="text-xs mt-1">PDF, JPG, PNG accepted</p>
          </div>
        )}
      </div>
      <input ref={ref} type="file" accept={accept} className="hidden"
        onChange={e => {
          const f = e.target.files?.[0] ?? null
          setFileName(f?.name ?? '')
          onChange(f)
        }}
      />
    </div>
  )
}

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
    hasInsurance: '' as 'yes' | 'no' | '',
    generalNotes: '',
  })
  const [otherTrade, setOtherTrade] = useState('')
  const [w9File, setW9File] = useState<File | null>(null)
  const [workPhotos, setWorkPhotos] = useState<File[]>([])
  const [submitted, setSubmitted] = useState(false)
  const [saving, setSaving] = useState(false)
  const [uploadStatus, setUploadStatus] = useState('')
  const [error, setError] = useState('')

  function set(key: string, val: unknown) {
    setForm(p => ({ ...p, [key]: val }))
  }

  function toggleTrade(trade: string) {
    setForm(p => ({
      ...p,
      trades: p.trades.includes(trade) ? p.trades.filter(t => t !== trade) : [...p.trades, trade],
    }))
  }

  function addOtherTrade() {
    const val = otherTrade.trim()
    if (!val || form.trades.includes(val)) return
    setForm(p => ({ ...p, trades: [...p.trades, val] }))
    setOtherTrade('')
  }

  async function uploadFile(file: File, name: string): Promise<string> {
    const fd = new FormData()
    fd.append('file', file)
    fd.append('name', name)
    const res = await fetch('/api/upload', { method: 'POST', body: fd })
    const data = await res.json()
    if (!res.ok) throw new Error(data.error)
    return data.url
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (form.trades.length === 0) { setError('Please select at least one trade.'); return }
    if (!form.hasInsurance) { setError('Please indicate if you have insurance.'); return }
    setSaving(true)
    setError('')

    try {
      let w9Url = ''

      if (w9File) {
        setUploadStatus('Uploading W9...')
        w9Url = await uploadFile(w9File, 'w9')
      }

      let photoUrls: string[] = []
      if (workPhotos.length > 0) {
        setUploadStatus(`Uploading work photos (0/${workPhotos.length})...`)
        photoUrls = await Promise.all(
          workPhotos.map(async (photo, i) => {
            setUploadStatus(`Uploading work photos (${i + 1}/${workPhotos.length})...`)
            return uploadFile(photo, `photo-${i + 1}`)
          })
        )
      }

      setUploadStatus('Saving your information...')

      const notes = [
        form.yearsExperience ? `Years of experience: ${form.yearsExperience}` : '',
        form.hasInsurance === 'yes' ? 'Has insurance: YES' : 'Has insurance: NO',
        w9Url ? `W9 Document: ${w9Url}` : '',
        photoUrls.length > 0 ? `Work Photos:\n${photoUrls.map((u, i) => `  Photo ${i + 1}: ${u}`).join('\n')}` : '',
        form.generalNotes,
      ].filter(Boolean).join('\n')

      const fields: Record<string, unknown> = {
        'Business Name':         form.businessName,
        'Primary Contact Name':  form.contactName,
        'Contact Email':         form.contactEmail,
        'Contact Phone':         form.contactPhone,
        'Crew Size':             form.crewSize ? Number(form.crewSize) : undefined,
        'Types of Work/Trades':  form.trades,
        'Cities Served':         form.citiesServed,
        'Insurance Verification': form.hasInsurance === 'yes' ? 'Pending' : 'Not Verified',
        'W9 Status':             'Pending',
        '1099 Status':           'Pending',
        'Approval Status':       'Pending',
        'General Notes':         notes,
      }

      const res = await fetch('/api/registro', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fields }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setSubmitted(true)
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setSaving(false)
      setUploadStatus('')
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
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Application Submitted!</h2>
          <p className="text-gray-500 mt-2">Thank you for registering with Tayco LLC. We have received your information and will be in touch soon.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-10 px-4">
      <div className="max-w-2xl mx-auto">

        <div className="text-center mb-8">
          <div className="w-14 h-14 rounded-xl bg-blue-600 flex items-center justify-center text-white font-bold text-2xl mx-auto mb-4">T</div>
          <h1 className="text-3xl font-bold text-gray-900">Join Our Network</h1>
          <p className="text-gray-500 mt-2">Register as a subcontractor with Tayco LLC. Fill out the form below to get started.</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8 flex flex-col gap-8">

          {/* Business Info */}
          <div>
            <h3 className="text-sm font-semibold text-blue-600 uppercase tracking-wider mb-4 pb-2 border-b border-gray-100">Business Information</h3>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
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
              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Cities Served <span className="text-red-500">*</span></label>
                <input required type="text" placeholder="e.g. Los Angeles, San Diego, Fresno"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={form.citiesServed} onChange={e => set('citiesServed', e.target.value)} />
              </div>
            </div>
          </div>

          {/* Contact Info */}
          <div>
            <h3 className="text-sm font-semibold text-blue-600 uppercase tracking-wider mb-4 pb-2 border-b border-gray-100">Contact Information</h3>
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
            <h3 className="text-sm font-semibold text-blue-600 uppercase tracking-wider mb-4 pb-2 border-b border-gray-100">Types of Work / Trades <span className="text-red-500">*</span></h3>
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

            {/* Other trade */}
            <div className="mt-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Don&apos;t see your trade? Type it and press <strong>+</strong>
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="e.g. Solar Panel Installation, Plumbing..."
                  className="flex-1 border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={otherTrade}
                  onChange={e => setOtherTrade(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addOtherTrade() } }}
                />
                <button
                  type="button"
                  onClick={addOtherTrade}
                  className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-4 rounded-lg text-lg transition-colors"
                >+</button>
              </div>
              {form.trades.filter(t => !['Cleaning','Drywall','Painting','HVAC','Concrete','Masonry','Flooring','Tile','Roofing','Insulation','Windows','Glass Installation','Demolition','Waterproofing','Sealants','Steel Erection','Welding','Fire Protection','Sprinklers','Other'].includes(t)).length > 0 && (
                <div className="mt-2 flex flex-wrap gap-2">
                  {form.trades.filter(t => !['Cleaning','Drywall','Painting','HVAC','Concrete','Masonry','Flooring','Tile','Roofing','Insulation','Windows','Glass Installation','Demolition','Waterproofing','Sealants','Steel Erection','Welding','Fire Protection','Sprinklers','Other'].includes(t)).map((t, i) => (
                    <span key={i} className="flex items-center gap-1.5 bg-blue-600 text-white text-sm font-medium px-3 py-1 rounded-lg">
                      {t}
                      <button type="button" onClick={() => setForm(p => ({ ...p, trades: p.trades.filter(x => x !== t) }))} className="hover:text-red-200 text-white ml-0.5">✕</button>
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Insurance */}
          <div>
            <h3 className="text-sm font-semibold text-blue-600 uppercase tracking-wider mb-4 pb-2 border-b border-gray-100">Insurance</h3>
            <label className="block text-sm font-medium text-gray-700 mb-3">Do you currently have General Liability Insurance? <span className="text-red-500">*</span></label>
            <div className="flex gap-4">
              <label className={`flex items-center gap-3 border-2 rounded-xl px-6 py-3 cursor-pointer transition-all ${form.hasInsurance === 'yes' ? 'border-green-500 bg-green-50' : 'border-gray-200 hover:border-gray-300'}`}>
                <input type="radio" name="insurance" value="yes" className="hidden"
                  checked={form.hasInsurance === 'yes'} onChange={() => set('hasInsurance', 'yes')} />
                <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${form.hasInsurance === 'yes' ? 'border-green-500 bg-green-500' : 'border-gray-300'}`}>
                  {form.hasInsurance === 'yes' && <div className="w-2 h-2 rounded-full bg-white" />}
                </div>
                <span className="font-medium text-gray-800">Yes, I have insurance</span>
              </label>
              <label className={`flex items-center gap-3 border-2 rounded-xl px-6 py-3 cursor-pointer transition-all ${form.hasInsurance === 'no' ? 'border-red-400 bg-red-50' : 'border-gray-200 hover:border-gray-300'}`}>
                <input type="radio" name="insurance" value="no" className="hidden"
                  checked={form.hasInsurance === 'no'} onChange={() => set('hasInsurance', 'no')} />
                <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${form.hasInsurance === 'no' ? 'border-red-400 bg-red-400' : 'border-gray-300'}`}>
                  {form.hasInsurance === 'no' && <div className="w-2 h-2 rounded-full bg-white" />}
                </div>
                <span className="font-medium text-gray-800">No</span>
              </label>
            </div>
          </div>

          {/* Document Uploads */}
          <div>
            <h3 className="text-sm font-semibold text-blue-600 uppercase tracking-wider mb-4 pb-2 border-b border-gray-100">Documents</h3>
            <FileUpload label="W9 Form" name="w9" accept=".pdf,.jpg,.jpeg,.png"
              onChange={setW9File} />
            <p className="text-xs text-gray-400 mt-2">Optional but required before starting any project with us.</p>
          </div>

          {/* Work Photos */}
          <div>
            <h3 className="text-sm font-semibold text-blue-600 uppercase tracking-wider mb-4 pb-2 border-b border-gray-100">Recent Work Photos <span className="text-gray-400 font-normal normal-case">(up to 5)</span></h3>
            <div
              onClick={() => document.getElementById('photo-input')?.click()}
              className="border-2 border-dashed border-gray-300 rounded-xl p-6 text-center cursor-pointer hover:border-blue-400 hover:bg-blue-50 transition-colors"
            >
              <svg className="w-8 h-8 mx-auto mb-2 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <p className="text-sm text-gray-500">Click to upload photos of your recent work</p>
              <p className="text-xs text-gray-400 mt-1">JPG, PNG — max 5 photos</p>
            </div>
            <input
              id="photo-input"
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={e => {
                const files = Array.from(e.target.files ?? []).slice(0, 5)
                setWorkPhotos(files)
              }}
            />
            {workPhotos.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-2">
                {workPhotos.map((f, i) => (
                  <div key={i} className="flex items-center gap-1.5 bg-green-50 border border-green-200 rounded-lg px-3 py-1.5">
                    <svg className="w-4 h-4 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                    <span className="text-xs text-green-700 font-medium">{f.name}</span>
                    <button type="button" onClick={() => setWorkPhotos(p => p.filter((_, j) => j !== i))}
                      className="text-green-400 hover:text-red-500 ml-1 text-xs">✕</button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Additional Information</label>
            <textarea rows={3} placeholder="Certifications, special equipment, references, anything else you'd like us to know..."
              className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={form.generalNotes} onChange={e => set('generalNotes', e.target.value)} />
          </div>

          {error && <p className="text-red-600 text-sm text-center bg-red-50 p-3 rounded-lg">{error}</p>}

          <button type="submit" disabled={saving}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white font-semibold py-3.5 rounded-xl transition-colors text-base">
            {saving ? (uploadStatus || 'Submitting...') : 'Submit Application'}
          </button>

          <p className="text-xs text-gray-400 text-center">By submitting this form you agree to be contacted by Tayco LLC regarding subcontracting opportunities.</p>
        </form>
      </div>
    </div>
  )
}
