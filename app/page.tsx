'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'

type TabId = 'leads' | 'investors' | 'clients' | 'contractors' | 'orders' | 'assignments' | 'estimates'
type AirtableRecord = { id: string; fields: Record<string, unknown> }

const STATUS_COLORS: Record<string, string> = {
  'Qualified':       'bg-green-100 text-green-800',
  'no contact':      'bg-gray-100 text-gray-600',
  'Active':          'bg-green-100 text-green-800',
  'Inactive':        'bg-red-100 text-red-700',
  'Received':        'bg-green-100 text-green-800',
  'Not Received':    'bg-red-100 text-red-700',
  'Verified':        'bg-green-100 text-green-800',
  'Not Verified':    'bg-red-100 text-red-700',
  'Pending':         'bg-yellow-100 text-yellow-800',
  'Approved':        'bg-green-100 text-green-800',
  'Pending Review':  'bg-blue-100 text-blue-800',
  'On Hold':         'bg-yellow-100 text-yellow-800',
  'Completed':       'bg-blue-100 text-blue-800',
  'Cancelled':       'bg-red-100 text-red-700',
  'Denied':          'bg-red-100 text-red-700',
  'Declined':        'bg-red-100 text-red-700',
}

const TRADE_COLORS: Record<string, string> = {
  'Cleaning':          'bg-orange-100 text-orange-800',
  'cleaning':          'bg-orange-100 text-orange-800',
  'Drywall':           'bg-blue-100 text-blue-800',
  'Painting':          'bg-green-100 text-green-800',
  'HVAC':              'bg-cyan-100 text-cyan-800',
  'Concrete':          'bg-gray-200 text-gray-700',
  'Masonry':           'bg-stone-100 text-stone-700',
  'Flooring':          'bg-teal-100 text-teal-800',
  'Tile':              'bg-teal-100 text-teal-800',
  'Roofing':           'bg-indigo-100 text-indigo-800',
  'Insulation':        'bg-purple-100 text-purple-800',
  'Windows':           'bg-sky-100 text-sky-800',
  'Glass Installation':'bg-sky-100 text-sky-800',
  'Demolition':        'bg-red-100 text-red-800',
  'Waterproofing':     'bg-blue-200 text-blue-900',
  'Sealants':          'bg-blue-200 text-blue-900',
  'Steel Erection':    'bg-orange-200 text-orange-900',
  'Welding':           'bg-orange-200 text-orange-900',
  'Fire Protection':   'bg-red-200 text-red-900',
  'Sprinklers':        'bg-red-200 text-red-900',
  'Other':             'bg-gray-100 text-gray-700',
}

type ColDef = { key: string; label: string; type?: 'status' | 'tags' | 'date' | 'currency' | 'number' | 'notes_field' | 'notes_link'; notesKey?: string; notesSource?: string; options?: string[]; trades?: boolean }

function extractFromNotes(notes: unknown, key: string): string {
  const text = typeof notes === 'string' ? notes : ''
  const escaped = key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const match = text.match(new RegExp(`^${escaped}:\\s*(.+)$`, 'm'))
  return match ? match[1].trim() : '—'
}

const TAB_COLUMNS: Record<TabId, ColDef[]> = {
  investors: [
    { key: 'Primary Contact Name', label: 'Nombre' },
    { key: 'Company Name',         label: 'Empresa' },
    { key: 'Contact Email',        label: 'Email' },
    { key: 'Contact Phone',        label: 'Teléfono' },
    { key: 'status',               label: 'Status',            type: 'status',      options: ['', 'no contact', 'Qualified'] },
    { key: 'Lead Notes',           label: 'Contacto Pref.',    type: 'notes_field', notesKey: 'Preferred Contact', notesSource: 'Lead Notes' },
    { key: 'Lead Notes',           label: 'Propiedades',       type: 'notes_field', notesKey: 'Properties Managed', notesSource: 'Lead Notes' },
    { key: 'Lead Notes',           label: 'Proyectos Activos', type: 'notes_field', notesKey: 'Active Projects', notesSource: 'Lead Notes' },
    { key: 'Lead Notes',           label: 'Estados',           type: 'notes_field', notesKey: 'States', notesSource: 'Lead Notes' },
    { key: 'Lead Notes',           label: 'Trabajo Necesario', type: 'notes_field', notesKey: 'Work Needed', notesSource: 'Lead Notes' },
    { key: 'Lead Notes',           label: 'Notas',             type: 'notes_field', notesKey: 'Notes', notesSource: 'Lead Notes' },
  ],
  leads: [
    { key: 'Company Name',         label: 'Empresa' },
    { key: 'Primary Contact Name', label: 'Contacto' },
    { key: 'Contact Email',        label: 'Email' },
    { key: 'Contact Phone',        label: 'Teléfono' },
    { key: 'status',               label: 'Status',   type: 'status', options: ['', 'no contact', 'Qualified'] },
    { key: 'Lead Notes',           label: 'Notas' },
  ],
  clients: [
    { key: 'Company Name',        label: 'Empresa' },
    { key: 'Contact Name',        label: 'Contacto' },
    { key: 'Contact Email',       label: 'Email' },
    { key: 'Contact Phone',       label: 'Teléfono' },
    { key: 'Contract Start Date', label: 'Inicio Contrato', type: 'date' },
    { key: 'Contract Status',     label: 'Status',          type: 'status', options: ['Active', 'Inactive'] },
  ],
  contractors: [
    { key: 'Business Name',                 label: 'Empresa' },
    { key: 'Primary Contact Name',          label: 'Contacto' },
    { key: 'Contact Phone',                 label: 'Teléfono' },
    { key: 'Contact Email',                 label: 'Email' },
    { key: 'Crew Size',                     label: 'Crew',        type: 'number' },
    { key: 'Types of Work/Trades',          label: 'Trades',      type: 'tags', trades: true, options: ['Cleaning','cleaning','Drywall','Painting','HVAC','Concrete','Masonry','Flooring','Tile','Roofing','Insulation','Windows','Windows/Doors','Glass Installation','Demolition','Waterproofing','Sealants','Steel Erection','Welding','Fire Protection','Sprinklers','Solar Installation','Framing','Plumbing','Electrical','Carpentry','Landscaping','General Labor','Irrigation','Other'] },
    { key: 'General Notes',                 label: 'Estado',        type: 'notes_field', notesKey: 'State' },
    { key: 'General Notes',                 label: 'Ciudades',      type: 'notes_field', notesKey: 'Cities' },
    { key: 'General Notes',                 label: 'Años Exp.',     type: 'notes_field', notesKey: 'Years in Business' },
    { key: 'General Notes',                 label: 'Asegurado',     type: 'notes_field', notesKey: 'Insured' },
    { key: 'General Notes',                 label: 'W9 Doc',        type: 'notes_link',  notesKey: 'W9' },
    { key: 'General Notes',                 label: 'Seguro Doc',    type: 'notes_link',  notesKey: 'Insurance COI' },
    { key: 'W9 Status',                     label: 'W9 Status',     type: 'status', options: ['Pending','Received','Not Received'] },
    { key: '1099 Status',                   label: '1099',          type: 'status', options: ['Pending','Received','Not Received'] },
    { key: 'Insurance Verification Status', label: 'Seguro Status', type: 'status', options: ['Pending','Verified','Not Verified'] },
    { key: 'Approval Status',               label: 'Aprobación',    type: 'status', options: ['Pending','Pending Review','Approved','Declined'] },
  ],
  orders: [
    { key: 'Project Name',       label: 'Proyecto' },
    { key: 'Company Name',       label: 'Empresa' },
    { key: 'Type of Work',       label: 'Tipo', type: 'tags', trades: true, options: ['Cleaning','Drywall','Painting','HVAC','Concrete','Masonry','Flooring','Tile','Roofing','Insulation','Windows','Glass Installation','Demolition','Waterproofing','Sealants','Steel Erection','Welding','Fire Protection','Sprinklers','Other'] },
    { key: 'State',              label: 'Estado' },
    { key: 'City',               label: 'Ciudad' },
    { key: 'Contract Price',     label: 'Precio', type: 'currency' },
    { key: 'Project Status',     label: 'Status', type: 'status', options: ['Active','On Hold','Completed','Cancelled'] },
  ],
  assignments: [
    { key: 'Assignment Name',    label: 'Asignación' },
    { key: 'Company Name',       label: 'Empresa' },
    { key: 'Subcontractor Name', label: 'Subcontratista' },
    { key: 'Type of Work',       label: 'Tipo', type: 'tags', trades: true, options: ['Cleaning','Drywall','Painting','HVAC','Concrete','Masonry','Flooring','Tile','Roofing','Insulation','Windows','Glass Installation','Demolition','Waterproofing','Sealants','Steel Erection','Welding','Fire Protection','Sprinklers','Other'] },
    { key: 'subcontractor cost', label: 'Costo',   type: 'currency' },
    { key: 'Permit Status',      label: 'Permiso', type: 'status', options: ['Pending','Approved','Denied'] },
    { key: 'Start Date',         label: 'Inicio',  type: 'date' },
    { key: 'Finish Date',        label: 'Fin',     type: 'date' },
  ],
  estimates: [
    { key: 'Primary Contact Name', label: 'Nombre' },
    { key: 'Contact Phone',        label: 'Teléfono' },
    { key: 'Contact Email',        label: 'Email' },
    { key: 'Company Name',         label: 'Empresa/Propiedad' },
    { key: 'Lead Notes',           label: 'Ciudad',       type: 'notes_field', notesKey: 'City',        notesSource: 'Lead Notes' },
    { key: 'Lead Notes',           label: 'Tipo Trabajo', type: 'notes_field', notesKey: 'Work Type',   notesSource: 'Lead Notes' },
    { key: 'Lead Notes',           label: 'Descripción',  type: 'notes_field', notesKey: 'Description', notesSource: 'Lead Notes' },
    { key: 'status',               label: 'Status',       type: 'status', options: ['Pending','Qualified','no contact'] },
  ],
}

const TABS = [
  { id: 'leads'       as TabId, label: 'Company Leads' },
  { id: 'investors'   as TabId, label: 'Investor Leads' },
  { id: 'estimates'   as TabId, label: 'Estimate Requests' },
  { id: 'clients'     as TabId, label: 'Active Clients' },
  { id: 'contractors' as TabId, label: 'Subcontractors' },
  { id: 'orders'      as TabId, label: 'Work Orders' },
  { id: 'assignments' as TabId, label: 'Assignments' },
]

function StatusBadge({ value }: { value: string }) {
  const cls = STATUS_COLORS[value] ?? 'bg-gray-100 text-gray-600'
  return <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${cls}`}>{value}</span>
}

function TagBadge({ value }: { value: string }) {
  const cls = TRADE_COLORS[value] ?? 'bg-gray-100 text-gray-700'
  return <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium mr-1 mb-0.5 ${cls}`}>{value}</span>
}

function ReadCell({ col, value, record }: { col: ColDef; value: unknown; record?: Record<string, unknown> }) {
  if (col.type === 'notes_field') {
    const src = col.notesSource ?? 'General Notes'
    const extracted = extractFromNotes(record?.[src], col.notesKey ?? col.label)
    return extracted === '—' ? <span className="text-gray-300">—</span> : <span className="max-w-[160px] truncate block">{extracted}</span>
  }
  if (col.type === 'notes_link') {
    const src = col.notesSource ?? 'General Notes'
    const url = extractFromNotes(record?.[src], col.notesKey ?? col.label)
    if (url === '—' || url.toLowerCase().includes('not uploaded')) return <span className="text-gray-300">—</span>
    return <a href={url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-800 underline text-xs font-medium">Ver documento</a>
  }
  if (value == null || value === '') return <span className="text-gray-300">—</span>
  if (col.type === 'status') return <StatusBadge value={String(value)} />
  if (col.type === 'tags') {
    const arr = Array.isArray(value) ? value : [value]
    const [expanded, setExpanded] = useState(false)
    const visible = expanded ? arr : arr.slice(0, 2)
    return (
      <div className="flex flex-wrap items-center gap-0.5">
        {visible.map((v, i) => <TagBadge key={i} value={String(v)} />)}
        {!expanded && arr.length > 2 && (
          <button onClick={() => setExpanded(true)} className="text-xs text-blue-500 hover:text-blue-700 font-medium ml-1">+{arr.length - 2}</button>
        )}
        {expanded && arr.length > 2 && (
          <button onClick={() => setExpanded(false)} className="text-xs text-gray-400 hover:text-gray-600 font-medium ml-1">menos</button>
        )}
      </div>
    )
  }
  if (col.type === 'currency') {
    const n = Number(value)
    return <span>${isNaN(n) ? String(value) : n.toLocaleString()}</span>
  }
  if (col.type === 'date') return <span>{String(value).split('T')[0]}</span>
  if (Array.isArray(value)) return <span>{value.join(', ')}</span>
  return <span className="max-w-[180px] truncate block">{String(value)}</span>
}

function EditCell({ col, value, onChange }: { col: ColDef; value: unknown; onChange: (v: unknown) => void }) {
  if (col.type === 'status' && col.options) {
    return (
      <select
        className="w-full border border-blue-300 rounded px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white"
        value={String(value ?? '')}
        onChange={e => onChange(e.target.value)}
      >
        {col.options.map(o => <option key={o} value={o}>{o || '—'}</option>)}
      </select>
    )
  }
  if (col.type === 'tags' && col.options) {
    const selected = Array.isArray(value) ? value as string[] : []
    return (
      <div className="flex flex-wrap gap-1 border border-blue-300 rounded p-1 bg-white min-w-[160px]">
        {col.options.map(o => {
          const on = selected.includes(o)
          return (
            <button key={o} type="button"
              onClick={() => onChange(on ? selected.filter(x => x !== o) : [...selected, o])}
              className={`px-1.5 py-0.5 rounded text-xs font-medium border transition-all ${on ? (TRADE_COLORS[o] ?? 'bg-blue-100 text-blue-800') + ' border-transparent' : 'border-gray-300 text-gray-500'}`}
            >{o}</button>
          )
        })}
      </div>
    )
  }
  if (col.type === 'date') {
    return (
      <input type="date"
        className="border border-blue-300 rounded px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
        value={String(value ?? '').split('T')[0]}
        onChange={e => onChange(e.target.value)}
      />
    )
  }
  if (col.type === 'currency' || col.type === 'number') {
    return (
      <input type="number"
        className="w-full border border-blue-300 rounded px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
        value={String(value ?? '')}
        onChange={e => onChange(Number(e.target.value))}
      />
    )
  }
  return (
    <input type="text"
      className="w-full border border-blue-300 rounded px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
      value={String(value ?? '')}
      onChange={e => onChange(e.target.value)}
    />
  )
}

// New record form (simple modal just for adding new)
function NewRecordModal({ tab, cols, onClose, onSaved }: { tab: TabId; cols: ColDef[]; onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState<Record<string, unknown>>({})
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  async function handleSave() {
    setSaving(true)
    setError('')
    try {
      const res = await fetch('/api/airtable', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tab, fields: form }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      onSaved()
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <h2 className="text-lg font-semibold text-gray-900">Nuevo Registro</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">&times;</button>
        </div>
        <div className="overflow-y-auto px-6 py-4 flex flex-col gap-3">
          {cols.map(col => (
            <div key={col.key}>
              <label className="block text-xs font-medium text-gray-500 mb-1 uppercase tracking-wide">{col.label}</label>
              <EditCell col={col} value={form[col.key]} onChange={v => setForm(p => ({ ...p, [col.key]: v }))} />
            </div>
          ))}
          {error && <p className="text-red-600 text-sm">{error}</p>}
        </div>
        <div className="flex justify-end gap-3 px-6 py-4 border-t">
          <button onClick={onClose} className="px-4 py-2 text-sm rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50">Cancelar</button>
          <button onClick={handleSave} disabled={saving} className="px-4 py-2 text-sm rounded-lg bg-blue-600 text-white font-medium hover:bg-blue-700 disabled:opacity-50">
            {saving ? 'Guardando...' : 'Guardar'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function CRM() {
  const [activeTab, setActiveTab]   = useState<TabId>('leads')
  const [records, setRecords]       = useState<AirtableRecord[]>([])
  const [loading, setLoading]       = useState(true)
  const [error, setError]           = useState('')
  const [editingId, setEditingId]   = useState<string | null>(null)
  const [editFields, setEditFields] = useState<Record<string, unknown>>({})
  const [saving, setSaving]         = useState(false)
  const [deleting, setDeleting]     = useState<string | null>(null)
  const [showNew, setShowNew]       = useState(false)
  const [search, setSearch]         = useState('')
  const [actioning, setActioning]   = useState<string | null>(null)

  const loadRecords = useCallback(async (tab: TabId) => {
    setLoading(true)
    setError('')
    setEditingId(null)
    try {
      const res = await fetch(`/api/airtable?tab=${tab}`)
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setRecords(data.records)
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadRecords(activeTab) }, [activeTab, loadRecords])

  function startEdit(rec: AirtableRecord) {
    setEditingId(rec.id)
    setEditFields({ ...rec.fields })
  }

  function cancelEdit() {
    setEditingId(null)
    setEditFields({})
  }

  async function saveEdit(id: string) {
    setSaving(true)
    try {
      const res = await fetch('/api/airtable', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tab: activeTab, recordId: id, fields: editFields }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setRecords(r => r.map(rec => rec.id === id ? { ...rec, fields: { ...rec.fields, ...editFields } } : rec))
      setEditingId(null)
    } catch (e) {
      alert((e as Error).message)
    } finally {
      setSaving(false)
    }
  }

  async function handleApproveReject(id: string, action: 'approve' | 'reject') {
    setActioning(id + action)
    try {
      const res = await fetch('/api/airtable', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tab: 'contractors',
          recordId: id,
          fields: { 'Approval Status': action === 'approve' ? 'Approved' : 'Declined' },
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setRecords(r => r.map(rec =>
        rec.id === id ? { ...rec, fields: { ...rec.fields, 'Approval Status': action === 'approve' ? 'Approved' : 'Declined' } } : rec
      ))
    } catch (e) {
      alert((e as Error).message)
    } finally {
      setActioning(null)
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('¿Eliminar este registro?')) return
    setDeleting(id)
    try {
      await fetch('/api/airtable', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tab: activeTab, recordId: id }),
      })
      setRecords(r => r.filter(rec => rec.id !== id))
    } finally {
      setDeleting(null)
    }
  }

  const cols = TAB_COLUMNS[activeTab]
  const tabRecords = activeTab === 'investors'
    ? records.filter(r => String(r.fields['Lead Notes'] ?? '').includes('TYPE: Investor Lead'))
    : activeTab === 'estimates'
    ? records.filter(r => String(r.fields['Lead Notes'] ?? '').includes('TYPE: Estimate Request'))
    : activeTab === 'leads'
    ? records.filter(r => !String(r.fields['Lead Notes'] ?? '').includes('TYPE: Investor Lead') && !String(r.fields['Lead Notes'] ?? '').includes('TYPE: Estimate Request'))
    : records
  const filtered = search
    ? tabRecords.filter(r => Object.values(r.fields).some(v => String(v ?? '').toLowerCase().includes(search.toLowerCase())))
    : tabRecords

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-screen-xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src="/logo.jpeg" alt="Tayco LLC" className="h-10 w-10 rounded-lg object-contain" />
            <span className="font-semibold text-gray-900 text-lg">Tayco Operation System</span>
          </div>
          <div className="flex items-center gap-4">
            <Link href="/requests" className="text-sm text-blue-600 hover:text-blue-800 font-medium">
              Vendor Requests
            </Link>
            <span className="text-xs text-gray-400">{new Date().toLocaleDateString('es-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</span>
          </div>
        </div>
      </header>

      {/* Tabs */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-screen-xl mx-auto px-4">
          <nav className="flex overflow-x-auto">
            {TABS.map(tab => (
              <button key={tab.id} onClick={() => { setActiveTab(tab.id); setSearch('') }}
                className={`px-5 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                  activeTab === tab.id ? 'border-blue-500 text-blue-600 bg-blue-50/50' : 'border-transparent text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                }`}
              >{tab.label}</button>
            ))}
          </nav>
        </div>
      </div>

      {/* Toolbar */}
      <div className="max-w-screen-xl mx-auto px-4 py-4 w-full flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">{TABS.find(t => t.id === activeTab)?.label}</h2>
          <p className="text-sm text-gray-400">{filtered.length} registro{filtered.length !== 1 ? 's' : ''}</p>
        </div>
        <div className="flex items-center gap-3">
          <input type="search" placeholder="Buscar..." value={search} onChange={e => setSearch(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-48"
          />
          <button onClick={() => setShowNew(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-1.5 rounded-lg transition-colors">
            + Nuevo
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="max-w-screen-xl mx-auto px-4 pb-8 w-full flex-1">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          {loading && (
            <div className="flex items-center justify-center py-20 text-gray-400">
              <svg className="animate-spin h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
              </svg>
              Cargando...
            </div>
          )}
          {error && <div className="p-6 text-red-600 text-sm"><strong>Error:</strong> {error}</div>}
          {!loading && !error && (
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="w-8 px-3 py-3 text-left text-xs font-semibold text-gray-400">#</th>
                    {cols.map(col => (
                      <th key={col.key} className="px-3 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">
                        {col.label}
                      </th>
                    ))}
                    <th className="px-3 py-3 text-right text-xs font-semibold text-gray-400">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filtered.length === 0 && (
                    <tr>
                      <td colSpan={cols.length + 2} className="px-4 py-12 text-center text-gray-400">
                        No hay registros. Haz click en <strong>+ Nuevo</strong> para agregar uno.
                      </td>
                    </tr>
                  )}
                  {filtered.map((rec, i) => {
                    const isEditing = editingId === rec.id
                    return (
                      <tr key={rec.id} className={`transition-colors ${isEditing ? 'bg-blue-50' : 'hover:bg-gray-50'}`}>
                        <td className="px-3 py-2 text-gray-300 text-xs">{i + 1}</td>
                        {cols.map((col, ci) => (
                          <td key={col.key + ci} className="px-3 py-2 text-gray-700">
                            {isEditing
                              ? <EditCell col={col} value={editFields[col.key]} onChange={v => setEditFields(p => ({ ...p, [col.key]: v }))} />
                              : <ReadCell col={col} value={rec.fields[col.key]} record={rec.fields} />
                            }
                          </td>
                        ))}
                        <td className="px-3 py-2 text-right whitespace-nowrap">
                          {isEditing ? (
                            <div className="flex items-center justify-end gap-2">
                              <button onClick={() => saveEdit(rec.id)} disabled={saving}
                                className="bg-green-600 hover:bg-green-700 text-white text-xs font-medium px-3 py-1 rounded-lg disabled:opacity-50">
                                {saving ? '...' : 'Guardar'}
                              </button>
                              <button onClick={cancelEdit}
                                className="bg-gray-200 hover:bg-gray-300 text-gray-700 text-xs font-medium px-3 py-1 rounded-lg">
                                Cancelar
                              </button>
                            </div>
                          ) : (
                            <div className="flex items-center justify-end gap-2 flex-wrap">
                              {activeTab === 'contractors' && (() => {
                                const status = String(rec.fields['Approval Status'] ?? '')
                                const isPending = status === 'Pending' || status === 'Pending Review'
                                return isPending ? (
                                  <>
                                    <button
                                      onClick={() => handleApproveReject(rec.id, 'approve')}
                                      disabled={actioning !== null}
                                      className="bg-green-600 hover:bg-green-700 text-white text-xs font-semibold px-3 py-1 rounded-lg disabled:opacity-40 transition-colors"
                                    >
                                      {actioning === rec.id + 'approve' ? '...' : 'Aprobar'}
                                    </button>
                                    <button
                                      onClick={() => handleApproveReject(rec.id, 'reject')}
                                      disabled={actioning !== null}
                                      className="bg-red-500 hover:bg-red-600 text-white text-xs font-semibold px-3 py-1 rounded-lg disabled:opacity-40 transition-colors"
                                    >
                                      {actioning === rec.id + 'reject' ? '...' : 'Rechazar'}
                                    </button>
                                  </>
                                ) : null
                              })()}
                              <button onClick={() => startEdit(rec)}
                                className="text-blue-500 hover:text-blue-700 text-xs font-medium">
                                Editar
                              </button>
                              <button onClick={() => handleDelete(rec.id)} disabled={deleting === rec.id}
                                className="text-red-400 hover:text-red-600 text-xs font-medium disabled:opacity-40">
                                {deleting === rec.id ? '...' : 'Eliminar'}
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {showNew && (
        <NewRecordModal
          tab={activeTab}
          cols={cols}
          onClose={() => setShowNew(false)}
          onSaved={() => { setShowNew(false); loadRecords(activeTab) }}
        />
      )}
    </div>
  )
}
