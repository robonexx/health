import { NextResponse } from 'next/server';
import { getDb } from '@/lib/mongodb';
import { getFreshSessionUser } from '@/lib/auth';
import { ownerQueryForUser, requireOwnerAccess } from '@/lib/permissions';
import type { PlanOwner, SavedWeekPlan } from '@/lib/types';

function isOwner(value: unknown): value is PlanOwner { return typeof value === 'string' && value.trim().length > 0; }

export async function GET(request: Request) {
  try {
    const user = await getFreshSessionUser();
    if (!user) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    const owner = new URL(request.url).searchParams.get('owner');
    const db = await getDb();
    const query = await ownerQueryForUser(db, user, owner);
    const weekPlans = await db.collection('savedWeekPlans').find(query).sort({ createdAt: -1 }).toArray();
    return NextResponse.json({ weekPlans });
  } catch (error) {
    console.error(error);
    if (error instanceof Error && error.message === 'FORBIDDEN') return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
    return NextResponse.json({ message: 'Could not load saved week plans' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const user = await getFreshSessionUser();
    if (!user) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    const body = (await request.json()) as SavedWeekPlan;
    if (!isOwner(body.owner) || !body.title?.trim()) return NextResponse.json({ message: 'Owner and title are required' }, { status: 400 });
    const db = await getDb();
    await requireOwnerAccess(db, body.owner, user);
    const now = new Date().toISOString();
    const weekPlan: Omit<SavedWeekPlan, '_id'> = { owner: body.owner, title: body.title.trim(), description: body.description?.trim() || '', days: Array.isArray(body.days) ? body.days : [], createdBy: user.key, createdAt: now, updatedAt: now };
    const result = await db.collection('savedWeekPlans').insertOne(weekPlan);
    return NextResponse.json({ weekPlan: { ...weekPlan, _id: result.insertedId } }, { status: 201 });
  } catch (error) {
    console.error(error);
    if (error instanceof Error && error.message === 'FORBIDDEN') return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
    return NextResponse.json({ message: 'Could not save week plan' }, { status: 500 });
  }
}
