import { NextResponse } from 'next/server';
import { getDb } from '@/lib/mongodb';
import type { DayPlanKind, PlanOwner, SavedDayPlan, UserKey } from '@/lib/types';

const kinds: DayPlanKind[] = ['food', 'training', 'full'];
function isOwner(value: unknown): value is PlanOwner { return typeof value === 'string' && value.trim().length > 0; }
function isUser(value: unknown): value is UserKey { return typeof value === 'string' && value.trim().length > 0; }
function isKind(value: unknown): value is DayPlanKind { return typeof value === 'string' && kinds.includes(value as DayPlanKind); }

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const owner = searchParams.get('owner');
    const query: Record<string, unknown> = {};
    if (owner && isOwner(owner)) query.owner = owner;
    const db = await getDb();
    const dayPlans = await db.collection('savedDayPlans').find(query).sort({ createdAt: -1 }).toArray();
    return NextResponse.json({ dayPlans });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ message: 'Could not load saved day plans' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as SavedDayPlan;
    if (!isOwner(body.owner) || !body.title?.trim() || !isUser(body.createdBy)) {
      return NextResponse.json({ message: 'Owner, title and createdBy are required' }, { status: 400 });
    }
    const now = new Date().toISOString();
    const dayPlan: Omit<SavedDayPlan, '_id'> = {
      owner: body.owner,
      title: body.title.trim(),
      kind: isKind(body.kind) ? body.kind : 'full',
      meals: Array.isArray(body.meals) ? body.meals : [],
      activities: Array.isArray(body.activities) ? body.activities : [],
      createdBy: body.createdBy,
      createdAt: now,
      updatedAt: now,
    };
    const db = await getDb();
    const result = await db.collection('savedDayPlans').insertOne(dayPlan);
    return NextResponse.json({ dayPlan: { ...dayPlan, _id: result.insertedId } }, { status: 201 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ message: 'Could not save day plan' }, { status: 500 });
  }
}
