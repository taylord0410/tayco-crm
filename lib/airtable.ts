export type TabId = 'leads' | 'investors' | 'clients' | 'contractors' | 'approved' | 'orders' | 'assignments' | 'estimates'

const airtableApiKey = process.env.AIRTABLE_API_KEY || ''
const airtableBaseId = process.env.AIRTABLE_BASE_ID || ''

export const airtableTableNames: Record<TabId, string> = {
  leads:       process.env.AIRTABLE_TABLE_LEADS        || 'Company Leads',
  investors:   process.env.AIRTABLE_TABLE_LEADS        || 'Company Leads',
  clients:     process.env.AIRTABLE_TABLE_CLIENTS      || 'Active Clients',
  contractors: process.env.AIRTABLE_TABLE_CONTRACTORS  || 'Subcontractors',
  orders:      process.env.AIRTABLE_TABLE_ORDERS       || 'work orders',
  assignments: process.env.AIRTABLE_TABLE_ASSIGNMENTS  || 'Assignments',
  estimates:   process.env.AIRTABLE_TABLE_LEADS        || 'Company Leads',
  approved:    process.env.AIRTABLE_TABLE_CONTRACTORS  || 'Subcontractors',
}

export function getAirtableTableName(tab: TabId) {
  return airtableTableNames[tab]
}

function getConfig() {
  if (!airtableApiKey || !airtableBaseId) {
    throw new Error('Missing AIRTABLE_API_KEY or AIRTABLE_BASE_ID in environment variables')
  }
  return { apiKey: airtableApiKey, baseId: airtableBaseId }
}

function baseUrl(tab: TabId) {
  const { baseId } = getConfig()
  return `https://api.airtable.com/v0/${baseId}/${encodeURIComponent(airtableTableNames[tab])}`
}

function headers() {
  const { apiKey } = getConfig()
  return {
    Authorization: `Bearer ${apiKey}`,
    'Content-Type': 'application/json',
  }
}

export type AirtableRecord = {
  id: string
  fields: Record<string, unknown>
}

export async function fetchRecords(tab: TabId): Promise<AirtableRecord[]> {
  const res = await fetch(`${baseUrl(tab)}?maxRecords=200&view=Grid%20view`, {
    headers: headers(),
    cache: 'no-store',
  })
  if (!res.ok) throw new Error(`Airtable GET failed (${res.status}): ${await res.text()}`)
  const data = await res.json() as { records?: AirtableRecord[] }
  return data.records ?? []
}

export async function createRecord(tab: TabId, fields: Record<string, unknown>): Promise<AirtableRecord> {
  const res = await fetch(baseUrl(tab), {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify({ fields }),
  })
  if (!res.ok) throw new Error(`Airtable POST failed (${res.status}): ${await res.text()}`)
  return res.json()
}

export async function updateRecord(tab: TabId, recordId: string, fields: Record<string, unknown>): Promise<AirtableRecord> {
  const res = await fetch(`${baseUrl(tab)}/${recordId}`, {
    method: 'PATCH',
    headers: headers(),
    body: JSON.stringify({ fields }),
  })
  if (!res.ok) throw new Error(`Airtable PATCH failed (${res.status}): ${await res.text()}`)
  return res.json()
}

export async function deleteRecord(tab: TabId, recordId: string): Promise<void> {
  const res = await fetch(`${baseUrl(tab)}/${recordId}`, {
    method: 'DELETE',
    headers: headers(),
  })
  if (!res.ok) throw new Error(`Airtable DELETE failed (${res.status}): ${await res.text()}`)
}
