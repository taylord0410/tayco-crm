import { NextRequest, NextResponse } from 'next/server'
import { createRecord } from '@/lib/airtable'
import { sendMissingDocsEmail } from '@/lib/email'

const airtableApiKey = process.env.AIRTABLE_API_KEY || ''
const airtableBaseId = process.env.AIRTABLE_BASE_ID || ''

async function findDuplicate(phone: string, email: string): Promise<boolean> {
  const tableName = encodeURIComponent('Subcontractors')
  const filterParts = []
  if (phone) filterParts.push(`{Contact Phone}="${phone}"`)
  if (email) filterParts.push(`{Contact Email}="${email}"`)
  if (filterParts.length === 0) return false
  const formula = filterParts.length > 1 ? `OR(${filterParts.join(',')})` : filterParts[0]
  const url = `https://api.airtable.com/v0/${airtableBaseId}/${tableName}?filterByFormula=${encodeURIComponent(formula)}&maxRecords=1`
  const res = await fetch(url, { headers: { Authorization: `Bearer ${airtableApiKey}` }, cache: 'no-store' })
  if (!res.ok) return false
  const data = await res.json() as { records?: unknown[] }
  return (data.records?.length ?? 0) > 0
}

export async function POST(req: NextRequest) {
  try {
    const { fields, missingDocs } = await req.json() as {
      fields: Record<string, unknown>
      missingDocs: string[]
    }

    const phone = (fields['Contact Phone'] as string) || ''
    const email = (fields['Contact Email'] as string) || ''

    const isDuplicate = await findDuplicate(phone, email)
    if (isDuplicate) {
      return NextResponse.json(
        { error: 'An application with this phone number or email already exists. Please contact Tayco LLC directly.' },
        { status: 409 }
      )
    }

    const record = await createRecord('contractors', fields)

    // Send missing-docs email if anything was left out — don't block the response
    if (missingDocs.length > 0 && email) {
      sendMissingDocsEmail({
        vendorName:   (fields['Primary Contact Name'] as string) || 'Vendor',
        businessName: (fields['Business Name'] as string) || 'your company',
        vendorEmail:  email,
        missingItems: missingDocs,
      }).catch(() => {/* silent — email failure should never block form submission */})
    }

    return NextResponse.json({ record })
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 })
  }
}
