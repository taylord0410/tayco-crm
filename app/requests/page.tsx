'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'

type AirtableRecord = { id: string; fields: Record<string, unknown> }
type Filter = 'pending' | 'approved' | 'denied' | 'all'

const TRADE_COLORS: Record<string, string> = {
  'Cleaning': 'bg-orange-100 text-orange-800',
  'Drywall': 'bg-blue-100 text-blue-800',
  'Painting': 'bg-green-100 text-green-800',
  'HVAC': 'bg-cyan-100 text-cyan-800',
  'Concrete': 'bg-gray-200 text-gray-700',
  'Masonry': 'bg-stone-100 text-stone-700',
  'Flooring': 'bg-teal-100 text-teal-800',
  'Tile': 'bg-teal-100 text-teal-800',
  'Roofing': 'bg-indigo-100 text-indigo-800',
  'Insulation': 'bg-purple-100 text-purple-800',
  'Windows': 'bg-sky-100 text-sky-800',
  'Glass Installation': 'bg-sky-100 text-sky-800',
  'Demolition': 'bg-red-100 text-red-800',
  'Waterproofing': 'bg-blue-200 text-blue-900',
  'Sealants': 'bg-blue-200 text-blue-900',
  'Steel Erection': 'bg-orange-200 text-orange-900',
  'Welding': 'bg-orange-200 text-orange-900',
  'Fire Protection': 'bg-red-200 text-red-900',
  'Sprinklers': 'bg-red-200 text-red-900',
  'Other': 'bg-gray-100 text-gray-700',
}

function parseNotes(notes: string) {
  const w9Match = notes.match(/W9 Document: (https?:\/\/\S+)/)
  const photosMatch = [...notes.matchAll(/Photo \d+: (https?:\/\/\S+)/g)]
  const hasInsurance = notes.includes('Has insurance: YES')
  return {
    w9Url: w9Match?.[1] ?? null,
    photoUrls: photosMatch.map(m => m[1]),
    hasInsurance,
  }
}

export default function Solicitudes() {
  const [records, setRecords] = useState<AirtableRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<Filter>('pending')
  const [actioning, setActioning] = useState<string | null>(null)

  const loadRecords = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/airtable?tab=contractors')
      const data = await res.json()
      if (res.ok) setRecords(data.records)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadRecords() }, [loadRecords])

  async function handleAction(id: string, action: 'approve' | 'reject') {
    setActioning(id + action)
    try {
      const res = await fetch('/api/airtable', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tab: 'contractors',
          recordId: id,
          fields: { 'Approval Status': action === 'approve' ? 'Approved' : 'Denied' },
        }),
      })
      if (res.ok) {
        setRecords(r => r.map(rec =>
          rec.id === id
            ? { ...rec, fields: { ...rec.fields, 'Approval Status': action === 'approve' ? 'Approved' : 'Denied' } }
            : rec
        ))
      }
    } finally {
      setActioning(null)
    }
  }

  const filtered = records.filter(r => {
    const status = String(r.fields['Approval Status'] ?? '')
    if (filter === 'pending') return status === 'Pending' || status === 'Pending Review'
    if (filter === 'approved') return status === 'Approved'
    if (filter === 'denied') return status === 'Denied'
    return true
  })

  const pendingCount = records.filter(r => {
    const s = String(r.fields['Approval Status'] ?? '')
    return s === 'Pending' || s === 'Pending Review'
  }).length

  const FILTERS: { id: Filter; label: string; color: string }[] = [
    { id: 'pending',  label: `Pendientes (${pendingCount})`, color: 'bg-yellow-500' },
    { id: 'approved', label: 'Aprobados',  color: 'bg-green-500' },
    { id: 'denied',   label: 'Rechazados', color: 'bg-red-500' },
    { id: 'all',      label: 'Todos',      color: 'bg-gray-500' },
  ]

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-screen-xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src="/logo.jpeg" alt="Tayco LLC" className="h-10 w-10 rounded-lg object-contain" />
            <div>
              <span className="font-semibold text-gray-900 text-lg">Tayco LLC</span>
              <span className="text-gray-400 text-sm ml-2">— Vendor Requests</span>
            </div>
          </div>
          <Link href="/" className="text-sm text-blue-600 hover:text-blue-800 font-medium flex items-center gap-1">
            ← Back to CRM
          </Link>
        </div>
      </header>

      <div className="max-w-screen-xl mx-auto px-4 py-6 w-full flex-1">

        {/* Filter tabs */}
        <div className="flex gap-2 mb-6 flex-wrap">
          {FILTERS.map(f => (
            <button key={f.id} onClick={() => setFilter(f.id)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all border ${
                filter === f.id
                  ? 'bg-gray-900 text-white border-gray-900'
                  : 'bg-white text-gray-600 border-gray-200 hover:border-gray-400'
              }`}>
              {f.label}
            </button>
          ))}
        </div>

        {loading && (
          <div className="flex items-center justify-center py-20 text-gray-400">
            <svg className="animate-spin h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
            </svg>
            Cargando solicitudes...
          </div>
        )}

        {!loading && filtered.length === 0 && (
          <div className="text-center py-20 text-gray-400">
            <svg className="w-12 h-12 mx-auto mb-3 opacity-30" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <p className="text-lg font-medium">No hay Vendor Requests aqui</p>
          </div>
        )}

        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
          {filtered.map(rec => {
            const f = rec.fields
            const status = String(f['Approval Status'] ?? '')
            const isPending = status === 'Pending' || status === 'Pending Review'
            const trades = Array.isArray(f['Types of Work/Trades']) ? f['Types of Work/Trades'] as string[] : []
            const notes = String(f['General Notes'] ?? '')
            const { w9Url, photoUrls, hasInsurance } = parseNotes(notes)

            return (
              <div key={rec.id} className={`bg-white rounded-2xl border shadow-sm flex flex-col overflow-hidden transition-all ${
                isPending ? 'border-yellow-200' : status === 'Approved' ? 'border-green-200' : 'border-red-200'
              }`}>
                {/* Status bar */}
                <div className={`h-1.5 w-full ${isPending ? 'bg-yellow-400' : status === 'Approved' ? 'bg-green-500' : 'bg-red-400'}`} />

                <div className="p-5 flex flex-col gap-4 flex-1">
                  {/* Name + status */}
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h3 className="font-semibold text-gray-900 text-base leading-tight">
                        {String(f['Business Name'] ?? '—')}
                      </h3>
                      <p className="text-sm text-gray-500 mt-0.5">{String(f['Primary Contact Name'] ?? '')}</p>
                    </div>
                    <span className={`text-xs font-semibold px-2.5 py-1 rounded-full shrink-0 ${
                      isPending ? 'bg-yellow-100 text-yellow-800' : status === 'Approved' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-700'
                    }`}>{status}</span>
                  </div>

                  {/* Contact info */}
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    {!!f['Contact Phone'] && (
                      <div>
                        <p className="text-xs text-gray-400 mb-0.5">Telefono</p>
                        <p className="text-gray-700 font-medium">{String(f['Contact Phone'])}</p>
                      </div>
                    )}
                    {!!f['Contact Email'] && (
                      <div>
                        <p className="text-xs text-gray-400 mb-0.5">Email</p>
                        <p className="text-gray-700 truncate">{String(f['Contact Email'])}</p>
                      </div>
                    )}
                    {!!f['Cities Served'] && (
                      <div className="col-span-2">
                        <p className="text-xs text-gray-400 mb-0.5">Ciudades</p>
                        <p className="text-gray-700">{String(f['Cities Served'])}</p>
                      </div>
                    )}
                    {!!f['Crew Size'] && (
                      <div>
                        <p className="text-xs text-gray-400 mb-0.5">Crew</p>
                        <p className="text-gray-700">{String(f['Crew Size'])} personas</p>
                      </div>
                    )}
                  </div>

                  {/* Trades */}
                  {trades.length > 0 ? (
                    <div>
                      <p className="text-xs text-gray-400 mb-1.5">Especialidades</p>
                      <div className="flex flex-wrap gap-1">
                        {trades.map((t, i) => (
                          <span key={i} className={`text-xs px-2 py-0.5 rounded font-medium ${TRADE_COLORS[t] ?? 'bg-gray-100 text-gray-700'}`}>{t}</span>
                        ))}
                      </div>
                    </div>
                  ) : null}

                  {/* Insurance + W9 */}
                  <div className="flex gap-3 text-xs">
                    <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg font-medium ${hasInsurance ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                      <div className={`w-1.5 h-1.5 rounded-full ${hasInsurance ? 'bg-green-500' : 'bg-gray-400'}`} />
                      Seguro: {hasInsurance ? 'Si' : 'No'}
                    </div>
                    {w9Url ? (
                      <a href={w9Url} target="_blank" rel="noreferrer"
                        className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-blue-50 text-blue-700 font-medium hover:bg-blue-100 transition-colors">
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                        Ver W9
                      </a>
                    ) : null}
                  </div>

                  {/* Work photos */}
                  {photoUrls.length > 0 ? (
                    <div>
                      <p className="text-xs text-gray-400 mb-1.5">Fotos de trabajo ({photoUrls.length})</p>
                      <div className="flex gap-2 flex-wrap">
                        {photoUrls.map((url, i) => (
                          <a key={i} href={url} target="_blank" rel="noreferrer">
                            <img src={url} alt={`Foto ${i + 1}`}
                              className="w-16 h-16 object-cover rounded-lg border border-gray-200 hover:opacity-80 transition-opacity" />
                          </a>
                        ))}
                      </div>
                    </div>
                  ) : null}

                  {/* Notes */}
                  {!!f['General Notes'] ? (
                    <div>
                      <p className="text-xs text-gray-400 mb-1">Notas adicionales</p>
                      <p className="text-xs text-gray-600 leading-relaxed line-clamp-3">{
                        notes.replace(/W9 Document:.*\n?/g, '').replace(/Photo \d+:.*\n?/g, '').replace(/Has insurance:.*\n?/g, '').replace(/Work Photos:\n?/g, '').trim()
                      }</p>
                    </div>
                  ) : null}
                </div>

                {/* Action buttons */}
                {isPending ? (
                  <div className="border-t border-gray-100 p-4 flex gap-3">
                    <button
                      onClick={() => handleAction(rec.id, 'approve')}
                      disabled={actioning !== null}
                      className="flex-1 bg-green-600 hover:bg-green-700 text-white font-semibold py-2.5 rounded-xl text-sm disabled:opacity-50 transition-colors"
                    >
                      {actioning === rec.id + 'approve' ? 'Guardando...' : 'Aprobar'}
                    </button>
                    <button
                      onClick={() => handleAction(rec.id, 'reject')}
                      disabled={actioning !== null}
                      className="flex-1 bg-red-500 hover:bg-red-600 text-white font-semibold py-2.5 rounded-xl text-sm disabled:opacity-50 transition-colors"
                    >
                      {actioning === rec.id + 'reject' ? 'Guardando...' : 'Rechazar'}
                    </button>
                  </div>
                ) : null}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
