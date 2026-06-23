'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'

type TabId = 'leads' | 'investors' | 'clients' | 'contractors' | 'approved' | 'orders' | 'assignments' | 'estimates' | 'network' | 'roofing' | 'approved_roofing'
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
  'Yes':             'bg-green-100 text-green-800',
  'No':              'bg-red-100 text-red-700',
  'Voicemail':       'bg-yellow-100 text-yellow-700',
  'Not Contacted':   'bg-red-100 text-red-700',
  'Contacted':       'bg-green-100 text-green-800',
  'Left Voicemail':  'bg-yellow-100 text-yellow-800',
  'Wrong Number':    'bg-orange-100 text-orange-800',
  'Out of Service':  'bg-gray-200 text-gray-600',
  'Not Approved':    'bg-red-100 text-red-700',
  'Interested':      'bg-green-100 text-green-800',
  'Not Interested':  'bg-red-100 text-red-700',
  'No Response':     'bg-gray-100 text-gray-500',
  'In Progress':     'bg-blue-100 text-blue-800',
  'In Talks':        'bg-blue-100 text-blue-800',
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
    { key: 'Primary Contact Name', label: 'Name' },
    { key: 'Company Name',         label: 'Company' },
    { key: 'Contact Email',        label: 'Email' },
    { key: 'Contact Phone',        label: 'Phone' },
    { key: 'status',               label: 'Status',          type: 'status',      options: ['', 'no contact', 'Qualified'] },
    { key: 'Lead Notes',           label: 'Pref. Contact',   type: 'notes_field', notesKey: 'Preferred Contact', notesSource: 'Lead Notes' },
    { key: 'Lead Notes',           label: 'Properties',      type: 'notes_field', notesKey: 'Properties Managed', notesSource: 'Lead Notes' },
    { key: 'Lead Notes',           label: 'Active Projects', type: 'notes_field', notesKey: 'Active Projects', notesSource: 'Lead Notes' },
    { key: 'Lead Notes',           label: 'States',          type: 'notes_field', notesKey: 'States', notesSource: 'Lead Notes' },
    { key: 'Lead Notes',           label: 'Work Needed',     type: 'notes_field', notesKey: 'Work Needed', notesSource: 'Lead Notes' },
    { key: 'Lead Notes',           label: 'Notes',           type: 'notes_field', notesKey: 'Notes', notesSource: 'Lead Notes' },
  ],
  leads: [
    { key: 'Company Name',         label: 'Company' },
    { key: 'Primary Contact Name', label: 'Contact' },
    { key: 'Contact Email',        label: 'Email' },
    { key: 'Contact Phone',        label: 'Phone' },
    { key: 'status',               label: 'Status',   type: 'status', options: ['', 'no contact', 'Qualified'] },
    { key: 'Lead Notes',           label: 'Notes' },
  ],
  clients: [
    { key: 'Company Name',        label: 'Company' },
    { key: 'Contact Name',        label: 'Contact' },
    { key: 'Contact Email',       label: 'Email' },
    { key: 'Contact Phone',       label: 'Phone' },
    { key: 'Contract Start Date', label: 'Contract Start', type: 'date' },
    { key: 'Contract Status',     label: 'Status',         type: 'status', options: ['Active', 'Inactive'] },
  ],
  approved: [
    { key: 'Business Name',                 label: 'Company' },
    { key: 'Primary Contact Name',          label: 'Contact' },
    { key: 'Contact Phone',                 label: 'Phone' },
    { key: 'Contact Email',                 label: 'Email' },
    { key: 'Types of Work/Trades',          label: 'Trades', type: 'tags', trades: true, options: ['Cleaning','Drywall','Painting','HVAC','Concrete','Masonry','Flooring','Tile','Roofing','Insulation','Windows','Glass Installation','Demolition','Waterproofing','Sealants','Steel Erection','Welding','Fire Protection','Sprinklers','Other'] },
    { key: 'General Notes',                 label: 'State',  type: 'notes_field', notesKey: 'State' },
    { key: 'General Notes',                 label: 'Cities', type: 'notes_field', notesKey: 'Cities' },
    { key: 'General Notes',                 label: 'W9 Doc',        type: 'notes_link', notesKey: 'W9' },
    { key: 'General Notes',                 label: 'Insurance Doc', type: 'notes_link', notesKey: 'Insurance COI' },
    { key: 'Approval Status',               label: 'Status', type: 'status', options: ['Approved'] },
  ],
  contractors: [
    { key: 'Business Name',                 label: 'Company' },
    { key: 'Primary Contact Name',          label: 'Contact' },
    { key: 'Contact Phone',                 label: 'Phone' },
    { key: 'Contact Email',                 label: 'Email' },
    { key: 'Crew Size',                     label: 'Crew',          type: 'number' },
    { key: 'Types of Work/Trades',          label: 'Trades',        type: 'tags', trades: true, options: ['Cleaning','cleaning','Drywall','Painting','HVAC','Concrete','Masonry','Flooring','Tile','Roofing','Insulation','Windows','Windows/Doors','Glass Installation','Demolition','Waterproofing','Sealants','Steel Erection','Welding','Fire Protection','Sprinklers','Solar Installation','Framing','Plumbing','Electrical','Carpentry','Landscaping','General Labor','Irrigation','Other'] },
    { key: 'General Notes',                 label: 'State',         type: 'notes_field', notesKey: 'State' },
    { key: 'General Notes',                 label: 'Cities',        type: 'notes_field', notesKey: 'Cities' },
    { key: 'General Notes',                 label: 'Years Exp.',    type: 'notes_field', notesKey: 'Years in Business' },
    { key: 'General Notes',                 label: 'Insured',       type: 'notes_field', notesKey: 'Insured' },
    { key: 'General Notes',                 label: 'W9 Doc',        type: 'notes_link',  notesKey: 'W9' },
    { key: 'General Notes',                 label: 'Insurance Doc', type: 'notes_link',  notesKey: 'Insurance COI' },
    { key: 'W9 Status',                     label: 'W9 Status',       type: 'status', options: ['Pending','Received','Not Received'] },
    { key: '1099 Status',                   label: '1099',            type: 'status', options: ['Pending','Received','Not Received'] },
    { key: 'Insurance Verification Status', label: 'Insurance Status',type: 'status', options: ['Pending','Verified','Not Verified'] },
    { key: 'Approval Status',               label: 'Approval',        type: 'status', options: ['Pending','Pending Review','Approved','Declined'] },
  ],
  orders: [
    { key: 'Project Name',       label: 'Project' },
    { key: 'Company Name',       label: 'Company' },
    { key: 'Type of Work',       label: 'Type', type: 'tags', trades: true, options: ['Cleaning','Drywall','Painting','HVAC','Concrete','Masonry','Flooring','Tile','Roofing','Insulation','Windows','Glass Installation','Demolition','Waterproofing','Sealants','Steel Erection','Welding','Fire Protection','Sprinklers','Other'] },
    { key: 'State',              label: 'State' },
    { key: 'City',               label: 'City' },
    { key: 'Contract Price',     label: 'Price', type: 'currency' },
    { key: 'Project Status',     label: 'Status', type: 'status', options: ['Active','On Hold','Completed','Cancelled'] },
  ],
  assignments: [
    { key: 'Assignment Name',    label: 'Assignment' },
    { key: 'Company Name',       label: 'Company' },
    { key: 'Subcontractor Name', label: 'Subcontractor' },
    { key: 'Type of Work',       label: 'Type', type: 'tags', trades: true, options: ['Cleaning','Drywall','Painting','HVAC','Concrete','Masonry','Flooring','Tile','Roofing','Insulation','Windows','Glass Installation','Demolition','Waterproofing','Sealants','Steel Erection','Welding','Fire Protection','Sprinklers','Other'] },
    { key: 'subcontractor cost', label: 'Cost',   type: 'currency' },
    { key: 'Permit Status',      label: 'Permit', type: 'status', options: ['Pending','Approved','Denied'] },
    { key: 'Start Date',         label: 'Start Date', type: 'date' },
    { key: 'Finish Date',        label: 'End Date',   type: 'date' },
  ],
  estimates: [
    { key: 'Primary Contact Name', label: 'Name' },
    { key: 'Contact Phone',        label: 'Phone' },
    { key: 'Contact Email',        label: 'Email' },
    { key: 'Company Name',         label: 'Company/Property' },
    { key: 'Lead Notes',           label: 'City',        type: 'notes_field', notesKey: 'City',        notesSource: 'Lead Notes' },
    { key: 'Lead Notes',           label: 'Work Type',   type: 'notes_field', notesKey: 'Work Type',   notesSource: 'Lead Notes' },
    { key: 'Lead Notes',           label: 'Description', type: 'notes_field', notesKey: 'Description', notesSource: 'Lead Notes' },
    { key: 'status',               label: 'Status',      type: 'status', options: ['Pending','Qualified','no contact'] },
  ],
  network: [
    { key: 'Business Name',   label: 'Company' },
    { key: 'Contact Name',    label: 'Contact' },
    { key: 'Contact Phone',   label: 'Phone' },
    { key: 'Contact Email',   label: 'Email' },
    { key: 'Network Type',    label: 'Network Type', type: 'tags', options: ['Labor','Referrals','Materials','Staffing','Other'] },
    { key: 'States Covered',  label: 'States' },
    { key: 'Services',        label: 'Services' },
    { key: 'Status',          label: 'Status', type: 'status', options: ['Active','Inactive','In Talks'] },
    { key: 'Notes',           label: 'Notes' },
  ],
  roofing: [
    { key: 'Company Name',    label: 'Company' },
    { key: 'Phone',           label: 'Phone Number' },
    { key: 'Email',           label: 'Email' },
    { key: 'Contacted',       label: 'Contacted',   type: 'status', options: ['Not Contacted','Contacted','Left Voicemail','Wrong Number','Out of Service'] },
    { key: 'Date Contacted',  label: 'Date Called',  type: 'date' },
    { key: 'Response',        label: 'Call Notes' },
    { key: 'Approval Status', label: 'Approval',    type: 'status', options: ['Pending','Approved','Not Approved'] },
    { key: 'Notes',           label: 'City' },
  ],
  approved_roofing: [
    { key: 'Company Name',      label: 'Company' },
    { key: 'Phone',             label: 'Phone Number' },
    { key: 'Email',             label: 'Email' },
    { key: 'Contacted',         label: 'Contacted',  type: 'status', options: ['Not Contacted','Contacted','Left Voicemail','Wrong Number','Out of Service'] },
    { key: 'Response',          label: 'Call Notes' },
    { key: 'Approval Status',   label: 'Approval',   type: 'status', options: ['Pending','Approved','Not Approved'] },
    { key: 'Notes',             label: 'City' },
  ],
}

function TagsCell({ value, compact = true, onOpenDetail, highlight }: { value: unknown; compact?: boolean; onOpenDetail?: () => void; highlight?: string }) {
  const arr = Array.isArray(value) ? value as string[] : [String(value)]
  if (!compact) {
    return <div className="flex flex-wrap gap-1">{arr.map((v, i) => <TagBadge key={i} value={v} />)}</div>
  }
  // When a trade filter is active, show ONLY the matching badge + count of the rest
  if (highlight) {
    const match = arr.find(t => t.toLowerCase().includes(highlight.toLowerCase())) ?? arr[0]
    const rest = arr.length - 1
    return (
      <div className="flex items-center gap-1 cursor-pointer" onClick={onOpenDetail} title="Click to view full details">
        <TagBadge value={match} />
        {rest > 0 && <span className="text-xs text-blue-500 font-semibold bg-blue-50 px-1.5 py-0.5 rounded">+{rest}</span>}
      </div>
    )
  }
  return (
    <div className="flex items-center gap-1 cursor-pointer" onClick={onOpenDetail} title="Click to view full details">
      <TagBadge value={arr[0]} />
      {arr.length > 1 && (
        <span className="text-xs text-blue-500 hover:text-blue-700 font-semibold bg-blue-50 px-1.5 py-0.5 rounded">+{arr.length - 1}</span>
      )}
    </div>
  )
}

const OPERATIONS_TABS = [
  { id: 'leads'            as TabId, label: 'Company Leads' },
  { id: 'investors'        as TabId, label: 'Investor Leads' },
  { id: 'estimates'        as TabId, label: 'Estimate Requests' },
  { id: 'clients'          as TabId, label: 'Active Clients' },
  { id: 'contractors'      as TabId, label: 'Subcontractors' },
  { id: 'approved'         as TabId, label: '✓ Approved Vendors' },
  { id: 'orders'           as TabId, label: 'Work Orders' },
  { id: 'assignments'      as TabId, label: 'Assignments' },
]

const ROOFING_TABS = [
  { id: 'roofing'          as TabId, label: 'Roofing Companies' },
  { id: 'approved_roofing' as TabId, label: '✓ Approved Roofing' },
]

const NETWORK_TABS = [
  { id: 'network' as TabId, label: 'Network Companies' },
]

function StatusBadge({ value }: { value: string }) {
  const cls = STATUS_COLORS[value] ?? 'bg-gray-100 text-gray-600'
  return <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${cls}`}>{value}</span>
}

function InlineSelect({ value, options, onChange }: { value: unknown; options: string[]; onChange: (v: string) => void }) {
  const [open, setOpen] = useState(false)
  const current = String(value ?? '')
  const cls = STATUS_COLORS[current] ?? 'bg-gray-100 text-gray-600'
  return (
    <div className="relative" onBlur={e => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setOpen(false) }}>
      <button type="button" onClick={() => setOpen(o => !o)}
        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${cls} border-2 border-transparent hover:border-blue-300 transition-all`}>
        {current || '— select —'} <span className="text-xs opacity-60">▾</span>
      </button>
      {open && (
        <div className="absolute z-50 top-full left-0 mt-1 bg-white rounded-xl shadow-xl border border-gray-100 py-1.5 min-w-[160px]">
          {options.filter(o => o).map(o => {
            const oCls = STATUS_COLORS[o] ?? 'bg-gray-100 text-gray-600'
            return (
              <button key={o} type="button"
                onMouseDown={() => { onChange(o); setOpen(false) }}
                className={`w-full text-left px-3 py-1.5 flex items-center gap-2 hover:bg-gray-50 transition-colors`}>
                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${oCls}`}>{o}</span>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}

function TagBadge({ value }: { value: string }) {
  const cls = TRADE_COLORS[value] ?? 'bg-gray-100 text-gray-700'
  return <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium mr-1 mb-0.5 ${cls}`}>{value}</span>
}

function ReadCell({ col, value, record, compact = true, onOpenDetail, highlight }: { col: ColDef; value: unknown; record?: Record<string, unknown>; compact?: boolean; onOpenDetail?: () => void; highlight?: string }) {
  if (col.type === 'notes_field') {
    const src = col.notesSource ?? 'General Notes'
    const extracted = extractFromNotes(record?.[src], col.notesKey ?? col.label)
    if (extracted === '—') return <span className="text-gray-300">—</span>
    return <span className={compact ? 'max-w-[160px] truncate block' : 'block whitespace-pre-wrap'}>{extracted}</span>
  }
  if (col.type === 'notes_link') {
    const src = col.notesSource ?? 'General Notes'
    const url = extractFromNotes(record?.[src], col.notesKey ?? col.label)
    if (url === '—' || url.toLowerCase().includes('not uploaded')) return <span className="text-gray-300">—</span>
    return <a href={url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-800 underline text-xs font-medium">View Document</a>
  }
  if (value == null || value === '') return <span className="text-gray-300">—</span>
  if (col.type === 'status') return <StatusBadge value={String(value)} />
  if (col.type === 'tags') return <TagsCell value={value} compact={compact} onOpenDetail={onOpenDetail} highlight={highlight} />
  if (col.type === 'currency') {
    const n = Number(value)
    return <span>${isNaN(n) ? String(value) : n.toLocaleString()}</span>
  }
  if (col.type === 'date') return <span>{String(value).split('T')[0]}</span>
  if (Array.isArray(value)) return <span>{value.join(', ')}</span>
  return <span className={compact ? 'max-w-[180px] truncate block' : 'block whitespace-pre-wrap'}>{String(value)}</span>
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
    <textarea
      rows={2}
      className="w-full border border-blue-300 rounded px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 resize-none"
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
          <h2 className="text-lg font-semibold text-gray-900">New Record</h2>
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
          <button onClick={onClose} className="px-4 py-2 text-sm rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50">Cancel</button>
          <button onClick={handleSave} disabled={saving} className="px-4 py-2 text-sm rounded-lg bg-blue-600 text-white font-medium hover:bg-blue-700 disabled:opacity-50">
            {saving ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  )
}

// Detail modal — shows every field for one record on a single page
function RecordDetailModal({ record, cols, onClose, onRecordUpdated }: { record: AirtableRecord; cols: ColDef[]; onClose: () => void; onRecordUpdated?: (id: string, fields: Record<string, unknown>) => void }) {
  const [uploading, setUploading] = useState<string | null>(null)
  const [uploadError, setUploadError] = useState('')

  const title = String(
    record.fields['Business Name'] ?? record.fields['Company Name'] ?? record.fields['Project Name'] ??
    record.fields['Assignment Name'] ?? record.fields['Primary Contact Name'] ?? 'Details'
  )

  async function handleDocUpload(docKey: 'W9' | 'Insurance COI', file: File) {
    setUploading(docKey)
    setUploadError('')
    try {
      const fd = new FormData()
      fd.append('file', file)
      fd.append('name', docKey === 'W9' ? 'w9' : 'insurance')
      const uploadRes = await fetch('/api/upload', { method: 'POST', body: fd })
      if (!uploadRes.ok) throw new Error('Upload failed')
      const { url } = await uploadRes.json() as { url: string }

      // Update the General Notes field with the new URL
      const currentNotes = String(record.fields['General Notes'] ?? '')
      const label = docKey === 'W9' ? 'W9' : 'Insurance COI'
      const updatedNotes = currentNotes.match(new RegExp(`${label}:`, 'i'))
        ? currentNotes.replace(new RegExp(`${label}:.*`, 'i'), `${label}: ${url}`)
        : currentNotes + `\n${label}: ${url}`

      // Also update the status field
      const statusField = docKey === 'W9' ? 'W9 Status' : 'Insurance Verification Status'
      const statusValue = docKey === 'W9' ? 'Received' : 'Verified'

      const patchRes = await fetch('/api/airtable', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tab: 'contractors',
          recordId: record.id,
          fields: { 'General Notes': updatedNotes, [statusField]: statusValue },
        }),
      })
      if (!patchRes.ok) throw new Error('Failed to save')
      onRecordUpdated?.(record.id, { 'General Notes': updatedNotes, [statusField]: statusValue })
    } catch (e) {
      setUploadError((e as Error).message)
    } finally {
      setUploading(null)
    }
  }

  const notes = String(record.fields['General Notes'] ?? '')
  const hasW9 = /W9:\s*https?:\/\//i.test(notes)
  const hasCOI = /Insurance COI:\s*https?:\/\//i.test(notes)

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">&times;</button>
        </div>
        <div className="overflow-y-auto px-6 py-4 flex flex-col gap-3">

          {/* Document upload section */}
          <div className="bg-blue-50 border border-blue-100 rounded-xl p-4">
            <p className="text-xs font-semibold text-blue-700 uppercase tracking-wide mb-3">Upload Documents</p>
            <div className="flex flex-col gap-2">
              {/* W9 */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full ${hasW9 ? 'bg-green-500' : 'bg-red-400'}`} />
                  <span className="text-sm font-medium text-gray-700">W9 Form</span>
                  {hasW9 && <span className="text-xs text-green-600 font-medium">✓ Uploaded</span>}
                </div>
                <label className="cursor-pointer bg-white border border-blue-300 hover:bg-blue-50 text-blue-700 text-xs font-medium px-3 py-1.5 rounded-lg transition-colors">
                  {uploading === 'W9' ? 'Uploading...' : hasW9 ? 'Replace' : '+ Upload'}
                  <input type="file" accept=".pdf,.jpg,.jpeg,.png" className="hidden"
                    onChange={e => { const f = e.target.files?.[0]; if (f) handleDocUpload('W9', f) }} />
                </label>
              </div>
              {/* Insurance COI */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full ${hasCOI ? 'bg-green-500' : 'bg-red-400'}`} />
                  <span className="text-sm font-medium text-gray-700">Certificate of Insurance (COI)</span>
                  {hasCOI && <span className="text-xs text-green-600 font-medium">✓ Uploaded</span>}
                </div>
                <label className="cursor-pointer bg-white border border-blue-300 hover:bg-blue-50 text-blue-700 text-xs font-medium px-3 py-1.5 rounded-lg transition-colors">
                  {uploading === 'Insurance COI' ? 'Uploading...' : hasCOI ? 'Replace' : '+ Upload'}
                  <input type="file" accept=".pdf,.jpg,.jpeg,.png" className="hidden"
                    onChange={e => { const f = e.target.files?.[0]; if (f) handleDocUpload('Insurance COI', f) }} />
                </label>
              </div>
              {uploadError && <p className="text-red-500 text-xs mt-1">{uploadError}</p>}
            </div>
          </div>

          {/* All fields */}
          {cols.map((col, i) => (
            <div key={col.key + col.label + i}>
              <label className="block text-xs font-medium text-gray-500 mb-1 uppercase tracking-wide">{col.label}</label>
              <div className="text-sm text-gray-800">
                <ReadCell col={col} value={record.fields[col.key]} record={record.fields} compact={false} />
              </div>
            </div>
          ))}
        </div>
        <div className="flex justify-end gap-3 px-6 py-4 border-t">
          <button onClick={onClose} className="px-4 py-2 text-sm rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50">Close</button>
        </div>
      </div>
    </div>
  )
}

export default function CRM() {
  const [mode, setMode]             = useState<'operations' | 'network'>('operations')
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [activeTab, setActiveTab]   = useState<TabId>('leads')
  const [records, setRecords]       = useState<AirtableRecord[]>([])
  const [loading, setLoading]       = useState(true)
  const [error, setError]           = useState('')
  const [editingId, setEditingId]   = useState<string | null>(null)
  const [editFields, setEditFields] = useState<Record<string, unknown>>({})
  const [saving, setSaving]         = useState(false)
  const [deleting, setDeleting]     = useState<string | null>(null)
  const [showNew, setShowNew]       = useState(false)
  const [viewingRecord, setViewingRecord] = useState<AirtableRecord | null>(null)
  const [search, setSearch]         = useState('')
  const [tradeFilter, setTradeFilter] = useState('')
  const [actioning, setActioning]   = useState<string | null>(null)
  const [inlineEdit, setInlineEdit] = useState<{id: string; key: string; value: unknown} | null>(null)

  function switchMode(m: 'operations' | 'network') {
    setMode(m)
    setActiveTab(m === 'network' ? 'network' : 'leads')
    setSearch('')
    setTradeFilter('')
    setEditingId(null)
  }

  const loadRecords = useCallback(async (tab: TabId) => {
    setLoading(true)
    setError('')
    setRecords([])
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

  async function handleRoofingAction(id: string, action: 'contacted' | 'not_contacted' | 'approve_roofing' | 'decline_roofing') {
    setActioning(id + action)
    const fields = action === 'contacted'      ? { 'Contacted': 'Yes' }
                 : action === 'not_contacted'  ? { 'Contacted': 'No' }
                 : action === 'approve_roofing'? { 'Approval Status': 'Approved' }
                 :                              { 'Approval Status': 'Declined' }
    try {
      const res = await fetch('/api/airtable', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tab: 'roofing', recordId: id, fields }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setRecords(r => r.map(rec => rec.id === id ? { ...rec, fields: { ...rec.fields, ...fields } } : rec))
    } catch (e) {
      alert((e as Error).message)
    } finally {
      setActioning(null)
    }
  }

  async function saveInline(id: string, key: string, value: unknown) {
    setInlineEdit(null)
    try {
      const res = await fetch('/api/airtable', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tab: activeTab, recordId: id, fields: { [key]: value } }),
      })
      if (!res.ok) return
      setRecords(r => r.map(rec => rec.id === id ? { ...rec, fields: { ...rec.fields, [key]: value } } : rec))
    } catch {}
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this record?')) return
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
    : activeTab === 'approved'
    ? records.filter(r => String(r.fields['Approval Status'] ?? '') === 'Approved')
    : activeTab === 'contractors'
    ? records.filter(r => String(r.fields['Approval Status'] ?? '') !== 'Approved')
    : activeTab === 'approved_roofing'
    ? records.filter(r => String(r.fields['Approval Status'] ?? '') === 'Approved')
    : activeTab === 'roofing'
    ? records.filter(r => String(r.fields['Approval Status'] ?? '') !== 'Approved')
    : records
  const isTradeTab = activeTab === 'contractors' || activeTab === 'approved'
  const TRADE_OPTIONS = ['Roofing','Drywall','Painting','Flooring','Cleaning','HVAC','Concrete','Masonry','Tile','Insulation','Windows','Glass Installation','Demolition','Waterproofing','Framing','Plumbing','Electrical','Carpentry','Welding','Landscaping','General Labor','Other']
  const tradeFiltered = tradeFilter
    ? tabRecords.filter(r => {
        const trades = r.fields['Types of Work/Trades']
        const tradeArr = Array.isArray(trades) ? trades as string[] : []
        return tradeArr.some(t => t.toLowerCase().includes(tradeFilter.toLowerCase()))
      })
    : tabRecords
  const filtered = search
    ? tradeFiltered.filter(r => Object.values(r.fields).some(v => String(v ?? '').toLowerCase().includes(search.toLowerCase())))
    : tradeFiltered

  return (
    <div className="min-h-screen flex flex-col" style={{background: 'linear-gradient(180deg, #f0f7ff 0%, #e0f2fe 40%, #ffffff 100%)'}}>
      {/* Sidebar overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 flex">
          <div className="absolute inset-0 bg-black/40" onClick={() => setSidebarOpen(false)} />
          <div className="relative w-72 bg-white shadow-2xl flex flex-col z-50">
            <div className="flex items-center justify-between px-5 py-4 border-b" style={{background: 'linear-gradient(90deg, #1e40af 0%, #0891b2 100%)'}}>
              <span className="font-bold text-white text-base">Menu</span>
              <button onClick={() => setSidebarOpen(false)} className="text-white/70 hover:text-white text-2xl leading-none">&times;</button>
            </div>
            {/* Mode toggle inside sidebar */}
            <div className="px-4 py-3 border-b bg-gray-50">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Mode</p>
              <div className="flex gap-2">
                <button onClick={() => { switchMode('operations'); setSidebarOpen(false) }}
                  className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-all ${mode === 'operations' ? 'bg-blue-600 text-white shadow' : 'bg-white border border-gray-300 text-gray-600 hover:border-blue-400'}`}>
                  Operations
                </button>
                <button onClick={() => { switchMode('network'); setSidebarOpen(false) }}
                  className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-all ${mode === 'network' ? 'bg-cyan-600 text-white shadow' : 'bg-white border border-gray-300 text-gray-600 hover:border-cyan-400'}`}>
                  Network
                </button>
              </div>
            </div>
            {/* Tab navigation */}
            <nav className="flex-1 overflow-y-auto p-3 flex flex-col gap-1">
              {mode === 'network' ? (
                <>
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide px-2 mb-1">Network</p>
                  {NETWORK_TABS.map(tab => (
                    <button key={tab.id}
                      onClick={() => { setActiveTab(tab.id); setSearch(''); setTradeFilter(''); setSidebarOpen(false) }}
                      className={`w-full text-left px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${activeTab === tab.id ? 'bg-blue-600 text-white shadow-sm' : 'text-gray-700 hover:bg-blue-50 hover:text-blue-700'}`}>
                      {tab.label}
                    </button>
                  ))}
                </>
              ) : (
                <>
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide px-2 mb-1">Operations</p>
                  {OPERATIONS_TABS.map(tab => (
                    <button key={tab.id}
                      onClick={() => { setActiveTab(tab.id); setSearch(''); setTradeFilter(''); setSidebarOpen(false) }}
                      className={`w-full text-left px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${activeTab === tab.id ? 'bg-blue-600 text-white shadow-sm' : 'text-gray-700 hover:bg-blue-50 hover:text-blue-700'}`}>
                      {tab.label}
                    </button>
                  ))}
                  <div className="border-t border-gray-100 mt-3 pt-3">
                    <p className="text-xs font-semibold text-orange-400 uppercase tracking-wide px-2 mb-1">Roofing</p>
                    {ROOFING_TABS.map(tab => (
                      <button key={tab.id}
                        onClick={() => { setActiveTab(tab.id); setSearch(''); setTradeFilter(''); setSidebarOpen(false) }}
                        className={`w-full text-left px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${activeTab === tab.id ? 'bg-orange-500 text-white shadow-sm' : 'text-gray-700 hover:bg-orange-50 hover:text-orange-700'}`}>
                        {tab.label}
                      </button>
                    ))}
                  </div>
                </>
              )}
              <div className="border-t border-gray-100 mt-3 pt-2">
                <Link href="/requests" onClick={() => setSidebarOpen(false)}
                  className="w-full text-left px-4 py-2.5 rounded-xl text-sm font-medium text-gray-700 hover:bg-blue-50 hover:text-blue-700 transition-all flex items-center gap-2">
                  Vendor Requests
                </Link>
              </div>
            </nav>
          </div>
        </div>
      )}

      {/* Header */}
      <header style={{background: 'linear-gradient(90deg, #1e40af 0%, #0891b2 60%, #06b6d4 100%)'}} className="shadow-md">
        <div className="max-w-screen-xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {/* Hamburger */}
            <button onClick={() => setSidebarOpen(true)} className="flex flex-col gap-1.5 p-1.5 rounded-lg hover:bg-white/10 transition-colors" aria-label="Open menu">
              <span className="block w-5 h-0.5 bg-white rounded-full" />
              <span className="block w-5 h-0.5 bg-white rounded-full" />
              <span className="block w-5 h-0.5 bg-white rounded-full" />
            </button>
            <img src="/logo.jpeg" alt="Tayco LLC" className="h-10 w-10 rounded-lg object-contain border-2 border-white/30" />
            <span className="font-bold text-white text-lg tracking-wide">Tayco Operation System</span>
          </div>
          <span className="text-xs text-white/70">{new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</span>
        </div>
      </header>

      {/* Tabs */}
      <div className="bg-white/80 backdrop-blur border-b border-blue-100 shadow-sm">
        <div className="max-w-screen-xl mx-auto px-4">
          <nav className="flex overflow-x-auto">
            {(mode === 'network' ? NETWORK_TABS : [...OPERATIONS_TABS, ...ROOFING_TABS]).map(tab => (
              <button key={tab.id} onClick={() => { setActiveTab(tab.id); setSearch(''); setTradeFilter('') }}
                className={`px-5 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                  activeTab === tab.id ? 'border-cyan-500 text-cyan-700 bg-cyan-50/60' : 'border-transparent text-gray-600 hover:text-cyan-700 hover:bg-cyan-50/40'
                }`}
              >{tab.label}</button>
            ))}
          </nav>
        </div>
      </div>

      {/* Toolbar */}
      <div className="max-w-screen-xl mx-auto px-4 py-4 w-full flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">{[...OPERATIONS_TABS, ...ROOFING_TABS, ...NETWORK_TABS].find(t => t.id === activeTab)?.label}</h2>
          <p className="text-sm text-gray-400">{filtered.length} record{filtered.length !== 1 ? 's' : ''}</p>
        </div>
        <div className="flex items-center gap-3">
          <input type="search" placeholder="Search..." value={search} onChange={e => setSearch(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-48"
          />
          <button onClick={() => setShowNew(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-1.5 rounded-lg transition-colors">
            + New
          </button>
        </div>
      </div>

      {/* Trade filter bar — only on Subcontractors and Approved Vendors */}
      {isTradeTab && (
        <div className="max-w-screen-xl mx-auto px-4 pb-3 w-full">
          <div className="bg-white border border-gray-200 rounded-xl px-4 py-3 shadow-sm">
            <div className="flex items-center gap-3 flex-wrap">
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">Filter by Trade:</span>
              <input
                type="search"
                placeholder="Type a trade (e.g. Roofing)..."
                value={tradeFilter}
                onChange={e => setTradeFilter(e.target.value)}
                className="border border-gray-300 rounded-lg px-3 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-52"
              />
              {tradeFilter && (
                <button onClick={() => setTradeFilter('')} className="text-xs text-gray-400 hover:text-gray-600 bg-gray-100 px-2 py-1 rounded-lg">
                  Clear ✕
                </button>
              )}
              <div className="flex flex-wrap gap-1.5 mt-1 w-full">
                {TRADE_OPTIONS.map(t => (
                  <button key={t} onClick={() => setTradeFilter(tradeFilter === t ? '' : t)}
                    className={`px-2.5 py-0.5 rounded-full text-xs font-medium border transition-all ${
                      tradeFilter === t
                        ? (TRADE_COLORS[t] ?? 'bg-blue-600 text-white') + ' border-transparent shadow'
                        : 'border-gray-300 text-gray-600 hover:border-blue-400 hover:text-blue-600'
                    }`}>
                    {t}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="max-w-screen-xl mx-auto px-4 pb-8 w-full flex-1">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          {loading && (
            <div className="flex items-center justify-center py-20 text-gray-400">
              <svg className="animate-spin h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
              </svg>
              Loading...
            </div>
          )}
          {error && (
            activeTab === 'network' ? (
              <div className="flex flex-col items-center justify-center py-16 px-8 text-center">
                <div className="text-5xl mb-4">🏗️</div>
                <h3 className="text-lg font-semibold text-gray-700 mb-2">Network Companies table not set up yet</h3>
                <p className="text-gray-500 text-sm max-w-md mb-4">
                  You need to create a table called <strong>"Network Companies"</strong> in your Airtable base first.
                </p>
                <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 text-left text-sm text-blue-800 max-w-md">
                  <p className="font-semibold mb-2">Columns to add:</p>
                  <ul className="space-y-1 text-xs">
                    <li>• <strong>Business Name</strong> (Single line text)</li>
                    <li>• <strong>Contact Name</strong> (Single line text)</li>
                    <li>• <strong>Contact Phone</strong> (Single line text)</li>
                    <li>• <strong>Contact Email</strong> (Email)</li>
                    <li>• <strong>Network Type</strong> (Single select: Labor, Referrals, Materials, Staffing, Other)</li>
                    <li>• <strong>States Covered</strong> (Single line text)</li>
                    <li>• <strong>Services</strong> (Long text)</li>
                    <li>• <strong>Status</strong> (Single select: Active, Inactive, In Talks)</li>
                    <li>• <strong>Notes</strong> (Long text)</li>
                  </ul>
                </div>
              </div>
            ) : (
              <div className="p-6 text-red-600 text-sm"><strong>Error:</strong> {error}</div>
            )
          )}
          {!loading && !error && (
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead style={{background: 'linear-gradient(90deg, #1e40af 0%, #0891b2 60%, #06b6d4 100%)'}}>
                  <tr>
                    <th className="w-8 px-2 py-2 text-left text-xs font-semibold text-white/70">#</th>
                    {cols.map(col => (
                      <th key={col.key} className="px-2 py-2 text-left text-xs font-semibold text-white uppercase tracking-wider whitespace-nowrap">
                        {col.label}
                      </th>
                    ))}
                    <th className="px-2 py-2 text-right text-xs font-semibold text-white/70">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {filtered.length === 0 && (
                    <tr>
                      <td colSpan={cols.length + 2} className="px-4 py-12 text-center text-gray-400">
                        No records. Click <strong>+ New</strong> to add one.
                      </td>
                    </tr>
                  )}
                  {filtered.map((rec, i) => {
                    const isEditing = editingId === rec.id
                    return (
                      <tr key={rec.id} className={`transition-colors ${isEditing ? 'bg-blue-50' : i % 2 === 0 ? 'bg-white hover:bg-blue-50/40' : 'bg-blue-50/20 hover:bg-blue-50/50'}`}>
                        <td className="px-2 text-gray-300 text-xs" style={{height:'32px'}}><div className="h-8 flex items-center overflow-hidden">{i + 1}</div></td>
                        {cols.map((col, ci) => {
                          const isInlineEditing = inlineEdit?.id === rec.id && inlineEdit?.key === col.key
                          const isRoofingTab = activeTab === 'roofing' || activeTab === 'approved_roofing'
                          const canInlineEdit = isRoofingTab && !isEditing && col.type !== 'notes_link'
                          return (
                            <td key={col.key + ci} className="px-2 text-gray-700 text-xs" style={{height:'32px'}}>
                              <div className="h-8 flex items-center overflow-hidden">
                              {isEditing ? (
                                <EditCell col={col} value={editFields[col.key]} onChange={v => setEditFields(p => ({ ...p, [col.key]: v }))} />
                              ) : isInlineEditing ? (
                                <div className="flex items-center gap-1" onBlur={e => { if (!e.currentTarget.contains(e.relatedTarget as Node)) saveInline(rec.id, col.key, inlineEdit.value) }}>
                                  {col.type === 'status' && col.options ? (
                                    <InlineSelect value={inlineEdit.value} options={col.options}
                                      onChange={v => saveInline(rec.id, col.key, v)} />
                                  ) : (
                                    <>
                                      <EditCell col={col} value={inlineEdit.value}
                                        onChange={v => setInlineEdit(p => p ? {...p, value: v} : null)} />
                                      <button onMouseDown={() => saveInline(rec.id, col.key, inlineEdit.value)}
                                        className="bg-blue-600 text-white text-xs px-1.5 py-0.5 rounded shrink-0">✓</button>
                                    </>
                                  )}
                                </div>
                              ) : canInlineEdit ? (
                                <div className="cursor-pointer w-full h-full flex items-center group"
                                  onClick={() => {
                                    const prefill = col.type === 'date' && !rec.fields[col.key]
                                      ? new Date().toISOString().split('T')[0]
                                      : rec.fields[col.key]
                                    setInlineEdit({id: rec.id, key: col.key, value: prefill})
                                  }}>
                                  <ReadCell col={col} value={rec.fields[col.key]} record={rec.fields} onOpenDetail={() => setViewingRecord(rec)} highlight={col.type === 'tags' && tradeFilter ? tradeFilter : undefined} />
                                  {!rec.fields[col.key] && <span className="opacity-0 group-hover:opacity-100 text-blue-400 italic text-xs transition-opacity">edit</span>}
                                </div>
                              ) : (
                                <ReadCell col={col} value={rec.fields[col.key]} record={rec.fields} onOpenDetail={() => setViewingRecord(rec)} highlight={col.type === 'tags' && tradeFilter ? tradeFilter : undefined} />
                              )}
                              </div>
                            </td>
                          )
                        })}
                        <td className="px-2 text-right whitespace-nowrap" style={{height:'32px', overflow:'hidden'}}>
                          <div className="h-8 flex items-center justify-end overflow-hidden">
                          {isEditing ? (
                            <div className="flex items-center justify-end gap-1">
                              <button onClick={() => saveEdit(rec.id)} disabled={saving}
                                className="bg-green-600 hover:bg-green-700 text-white text-xs font-medium px-2 py-0.5 rounded disabled:opacity-50">
                                {saving ? '...' : 'Save'}
                              </button>
                              <button onClick={cancelEdit}
                                className="bg-gray-200 hover:bg-gray-300 text-gray-700 text-xs font-medium px-2 py-0.5 rounded">
                                Cancel
                              </button>
                            </div>
                          ) : (
                            <div className="flex items-center justify-end gap-2 flex-nowrap">
                              {activeTab === 'contractors' && (() => {
                                const status = String(rec.fields['Approval Status'] ?? '')
                                const isPending = status === 'Pending' || status === 'Pending Review'
                                return isPending ? (
                                  <>
                                    <button onClick={() => handleApproveReject(rec.id, 'approve')} disabled={actioning !== null}
                                      className="bg-green-600 hover:bg-green-700 text-white text-xs font-semibold px-3 py-1 rounded-lg disabled:opacity-40 transition-colors">
                                      {actioning === rec.id + 'approve' ? '...' : 'Approve'}
                                    </button>
                                    <button onClick={() => handleApproveReject(rec.id, 'reject')} disabled={actioning !== null}
                                      className="bg-red-500 hover:bg-red-600 text-white text-xs font-semibold px-3 py-1 rounded-lg disabled:opacity-40 transition-colors">
                                      {actioning === rec.id + 'reject' ? '...' : 'Reject'}
                                    </button>
                                  </>
                                ) : null
                              })()}
                              {activeTab === 'roofing' && (() => {
                                const approval = String(rec.fields['Approval Status'] ?? '')
                                const notApproved = approval !== 'Approved'
                                return notApproved ? (
                                  <>
                                    <button onClick={() => handleRoofingAction(rec.id, 'approve_roofing')} disabled={actioning !== null}
                                      className="bg-green-600 hover:bg-green-700 text-white text-xs font-semibold px-2 py-0.5 rounded disabled:opacity-40 transition-colors">
                                      {actioning === rec.id + 'approve_roofing' ? '…' : '✓'}
                                    </button>
                                    <button onClick={() => handleRoofingAction(rec.id, 'decline_roofing')} disabled={actioning !== null}
                                      className="bg-red-500 hover:bg-red-600 text-white text-xs font-semibold px-2 py-0.5 rounded disabled:opacity-40 transition-colors">
                                      {actioning === rec.id + 'decline_roofing' ? '…' : '✕'}
                                    </button>
                                  </>
                                ) : null
                              })()}
                              <button onClick={() => startEdit(rec)}
                                className="text-blue-500 hover:text-blue-700 text-xs font-medium">
                                Edit
                              </button>
                              <button onClick={() => handleDelete(rec.id)} disabled={deleting === rec.id}
                                className="text-red-400 hover:text-red-600 text-xs font-medium disabled:opacity-40">
                                {deleting === rec.id ? '...' : 'Delete'}
                              </button>
                            </div>
                          )}
                          </div>
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

      {viewingRecord && (
        <RecordDetailModal
          record={viewingRecord}
          cols={cols}
          onClose={() => setViewingRecord(null)}
          onRecordUpdated={(id, fields) => {
            setRecords(r => r.map(rec => rec.id === id ? { ...rec, fields: { ...rec.fields, ...fields } } : rec))
            setViewingRecord(prev => prev && prev.id === id ? { ...prev, fields: { ...prev.fields, ...fields } } : prev)
          }}
        />
      )}
    </div>
  )
}
