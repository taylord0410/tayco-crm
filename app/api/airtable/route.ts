import { NextRequest, NextResponse } from 'next/server'
import { fetchRecords, createRecord, updateRecord, deleteRecord, type TabId } from '@/lib/airtable'

export async function GET(req: NextRequest) {
  const tab = req.nextUrl.searchParams.get('tab') as TabId | null
  if (!tab) return NextResponse.json({ error: 'Missing tab param' }, { status: 400 })
  try {
    const records = await fetchRecords(tab)
    return NextResponse.json({ records })
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const { tab, fields } = await req.json()
  try {
    const record = await createRecord(tab as TabId, fields)
    return NextResponse.json({ record })
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest) {
  const { tab, recordId, fields } = await req.json()
  try {
    const record = await updateRecord(tab as TabId, recordId, fields)
    return NextResponse.json({ record })
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  const { tab, recordId } = await req.json()
  try {
    await deleteRecord(tab as TabId, recordId)
    return NextResponse.json({ success: true })
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 })
  }
}
