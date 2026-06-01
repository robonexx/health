import { NextResponse } from 'next/server';
import { getDb } from '@/lib/mongodb';
import type { Activity, PlanOwner, UserKey } from '@/lib/types';

const owners: PlanOwner[] = ['shared', 'robert', 'erika'];
const users: UserKey[] = ['robert', 'erika'];

function isOwner(value: unknown): value is PlanOwner {
  return typeof value === 'string' && owners.includes(value as PlanOwner);
}

function isUser(value: unknown): value is UserKey {
  return typeof value === 'string' && users.includes(value as UserKey);
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const date = searchParams.get('date');
    const start = searchParams.get('start');
    const end = searchParams.get('end');
    const owner = searchParams.get('owner');
    const query: Record<string, unknown> = {};
    if (date) query.date = date;
    if (!date && (start || end)) query.date = { ...(start ? { $gte: start } : {}), ...(end ? { $lte: end } : {}) };
    if (owner && isOwner(owner)) query.owner = owner;

    const db = await getDb();
    const activities = await db.collection('activities').find(query).sort({ date: 1, time: 1, createdAt: 1 }).toArray();
    return NextResponse.json({ activities });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ message: 'Could not load activities' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as Activity;
    if (!isOwner(body.owner) || !body.date || !body.title?.trim() || !isUser(body.createdBy)) {
      return NextResponse.json({ message: 'Owner, date, title and createdBy are required' }, { status: 400 });
    }

    const now = new Date().toISOString();
    const activity: Omit<Activity, '_id'> = {
      owner: body.owner,
      date: body.date,
      title: body.title.trim(),
      time: body.time?.trim() || '',
      comment: body.comment?.trim() || '',
      completedBy: body.completedBy || {},
      createdBy: body.createdBy,
      createdAt: now,
      updatedAt: now,
    };

    const db = await getDb();
    const result = await db.collection('activities').insertOne(activity);
    return NextResponse.json({ activity: { ...activity, _id: result.insertedId } }, { status: 201 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ message: 'Could not create activity' }, { status: 500 });
  }
}
