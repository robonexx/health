import { NextResponse } from 'next/server';
import { getDb } from '@/lib/mongodb';
import { getFreshSessionUser } from '@/lib/auth';
import { ownerQueryForUser, requireOwnerAccess } from '@/lib/permissions';
import type { DayPlanKind, PlanOwner, SavedDayPlan } from '@/lib/types';

const kinds: DayPlanKind[] = ['food', 'training', 'full'];
function isOwner(value: unknown): value is PlanOwner { return typeof value === 'string' && value.trim().length > 0; }
function isKind(value: unknown): value is DayPlanKind { return typeof value === 'string' && kinds.includes(value as DayPlanKind); }

export async function GET(request: Request) {
  try {
    const user = await getFreshSessionUser();
    if (!user) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    const owner = new URL(request.url).searchParams.get('owner');
    const db = await getDb();
    const query = await ownerQueryForUser(db, user, owner);
    const dayPlans = await db.collection('savedDayPlans').find(query).sort({ createdAt: -1 }).toArray();
    return NextResponse.json({ dayPlans });
  } catch (error) {
    console.error(error);
    if (error instanceof Error && error.message === 'FORBIDDEN') return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
    return NextResponse.json({ message: 'Could not load saved day plans' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const user = await getFreshSessionUser();
    if (!user) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    const body = (await request.json()) as SavedDayPlan;
    if (!isOwner(body.owner) || !body.title?.trim()) return NextResponse.json({ message: 'Owner and title are required' }, { status: 400 });
    const db = await getDb();
    await requireOwnerAccess(db, body.owner, user);
    const now = new Date().toISOString();
    const dayPlan: Omit<SavedDayPlan, '_id'> = { owner: body.owner, title: body.title.trim(), kind: isKind(body.kind) ? body.kind : 'full', meals: Array.isArray(body.meals) ? body.meals : [], activities: Array.isArray(body.activities) ? body.activities : [], createdBy: user.key, createdAt: now, updatedAt: now };
    const result = await db.collection('savedDayPlans').insertOne(dayPlan);
    return NextResponse.json({ dayPlan: { ...dayPlan, _id: result.insertedId } }, { status: 201 });
  } catch (error) {
    console.error(error);
    if (error instanceof Error && error.message === 'FORBIDDEN') return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
    return NextResponse.json({ message: 'Could not save day plan' }, { status: 500 });
  }
}
