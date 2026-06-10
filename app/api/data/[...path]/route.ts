import { put, list, del } from '@vercel/blob'
import { NextRequest, NextResponse } from 'next/server'

const BLOB_PREFIX = 'manageop-data'

async function readData<T>(key: string): Promise<T[]> {
  try {
    const { blobs } = await list({ prefix: `${BLOB_PREFIX}/${key}` })
    if (blobs.length === 0) return []
    
    const blob = blobs[0]
    const response = await fetch(blob.url)
    return await response.json()
  } catch (error) {
    console.error(`Error reading ${key}:`, error)
    return []
  }
}

async function writeData<T>(key: string, data: T[]): Promise<void> {
  await put(`${BLOB_PREFIX}/${key}/data.json`, JSON.stringify(data), {
    access: 'public',
    addRandomSuffix: false,
  })
}

export async function GET(
  request: NextRequest,
  { params }: { params: { path: string[] } }
) {
  const path = params.path.join('/')
  
  try {
    const data = await readData(path)
    return NextResponse.json(data)
  } catch (error) {
    return NextResponse.json({ error: 'Failed to read data' }, { status: 500 })
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { path: string[] } }
) {
  const path = params.path.join('/')
  const body = await request.json()
  
  try {
    const data = await readData(path)
    const newItem = {
      ...body,
      id: body.id || crypto.randomUUID(),
      createdAt: body.createdAt || new Date().toISOString(),
    }
    
    data.push(newItem)
    await writeData(path, data)
    
    return NextResponse.json(newItem)
  } catch (error) {
    return NextResponse.json({ error: 'Failed to create item' }, { status: 500 })
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { path: string[] } }
) {
  const pathSegments = params.path
  const id = pathSegments[pathSegments.length - 1]
  const collection = pathSegments.slice(0, -1).join('/')
  const body = await request.json()
  
  try {
    const data: any[] = await readData(collection)
    const index = data.findIndex((item: any) => item.id === id)
    
    if (index === -1) {
      return NextResponse.json({ error: 'Item not found' }, { status: 404 })
    }
    
    data[index] = { ...data[index], ...body }
    await writeData(collection, data)
    
    return NextResponse.json(data[index])
  } catch (error) {
    return NextResponse.json({ error: 'Failed to update item' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { path: string[] } }
) {
  const pathSegments = params.path
  const id = pathSegments[pathSegments.length - 1]
  const collection = pathSegments.slice(0, -1).join('/')
  
  try {
    const data: any[] = await readData(collection)
    const filtered = data.filter((item: any) => item.id !== id)
    
    await writeData(collection, filtered)
    
    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to delete item' }, { status: 500 })
  }
}
