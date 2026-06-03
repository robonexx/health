import { NextResponse } from 'next/server';
import { getDb } from '@/lib/mongodb';
import { getFreshSessionUser } from '@/lib/auth';
import { ownerQueryForUser, requireOwnerAccess } from '@/lib/permissions';
import type { Activity, PlanOwner } from '@/lib/types';

function isOwner(value: unknown): value is PlanOwner { return typeof value === 'string' && value.trim().length > 0; }

export async function GET(request: Request) {
  try {
    const user = await getFreshSessionUser();
    if (!user) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    const { searchParams } = new URL(request.url);
    const date = searchParams.get('date');
    const start = searchParams.get('start');
    const end = searchParams.get('end');
    const owner = searchParams.get('owner');
    const db = await getDb();
    const query: Record<string, unknown> = { ...(await ownerQueryForUser(db, user, owner)) };
    if (date) query.date = date;
    if (!date && (start || end)) query.date = { ...(start ? { $gte: start } : {}), ...(end ? { $lte: end } : {}) };
    const activities = await db.collection('activities').find(query).sort({ date: 1, time: 1, createdAt: 1 }).toArray();
    return NextResponse.json({ activities });
  } catch (error) {
    console.error(error);
    if (error instanceof Error && error.message === 'FORBIDDEN') return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
    return NextResponse.json({ message: 'Could not load activities' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const user = await getFreshSessionUser();
    if (!user) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    const body = (await request.json()) as Activity;
    if (!isOwner(body.owner) || !body.date || !body.title?.trim()) return NextResponse.json({ message: 'Owner, date and title are required' }, { status: 400 });
    const db = await getDb();
    await requireOwnerAccess(db, body.owner, user);
    const now = new Date().toISOString();
    const activity: Omit<Activity, '_id'> = {
      owner: body.owner,
      date: body.date,
      title: body.title.trim(),
      time: body.time?.trim() || '',
      comment: body.comment?.trim() || '',
      completedBy: body.completedBy || {},
      createdBy: user.key,
      createdAt: now,
      updatedAt: now,
    };
    const result = await db.collection('activities').insertOne(activity);
    return NextResponse.json({ activity: { ...activity, _id: result.insertedId } }, { status: 201 });
  } catch (error) {
    console.error(error);
    if (error instanceof Error && error.message === 'FORBIDDEN') return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
    return NextResponse.json({ message: 'Could not create activity' }, { status: 500 });
  }
}
