import { NextResponse } from 'next/server';
import { getDb } from '@/lib/mongodb';
import type { HealthTip } from '@/lib/types';

export async function GET() {
  try {
    const db = await getDb();
    const tips = await db.collection('healthTips').find({}).sort({ createdAt: -1 }).toArray();
    return NextResponse.json({ tips });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ message: 'Could not load health tips' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as HealthTip;

    if (!body.title || !body.body || !body.createdBy) {
      return NextResponse.json({ message: 'Title, body and createdBy are required' }, { status: 400 });
    }

    const now = new Date().toISOString();
    const tip: Omit<HealthTip, '_id'> = {
      title: body.title,
      body: body.body,
      category: body.category || 'other',
      createdBy: body.createdBy,
      createdAt: now,
      updatedAt: now,
    };

    const db = await getDb();
    const result = await db.collection('healthTips').insertOne(tip);

    return NextResponse.json({ tip: { ...tip, _id: result.insertedId } }, { status: 201 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ message: 'Could not create health tip' }, { status: 500 });
  }
}
