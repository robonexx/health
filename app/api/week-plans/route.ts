import { NextResponse } from 'next/server';
import { getDb } from '@/lib/mongodb';
import type { PlanOwner, SavedWeekPlan, UserKey } from '@/lib/types';

const owners: PlanOwner[] = ['shared', 'robert', 'erika'];
const users: UserKey[] = ['robert', 'erika'];
function isOwner(value: unknown): value is PlanOwner { return typeof value === 'string' && owners.includes(value as PlanOwner); }
function isUser(value: unknown): value is UserKey { return typeof value === 'string' && users.includes(value as UserKey); }

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const owner = searchParams.get('owner');
    const query: Record<string, unknown> = {};
    if (owner && isOwner(owner)) query.owner = owner;
    const db = await getDb();
    const weekPlans = await db.collection('savedWeekPlans').find(query).sort({ createdAt: -1 }).toArray();
    return NextResponse.json({ weekPlans });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ message: 'Could not load saved week plans' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as SavedWeekPlan;
    if (!isOwner(body.owner) || !body.title?.trim() || !isUser(body.createdBy)) {
      return NextResponse.json({ message: 'Owner, title and createdBy are required' }, { status: 400 });
    }
    const now = new Date().toISOString();
    const weekPlan: SavedWeekPlan = {
      owner: body.owner,
      title: body.title.trim(),
      description: body.description?.trim() || '',
      days: Array.isArray(body.days) ? body.days : [],
      createdBy: body.createdBy,
      createdAt: now,
      updatedAt: now,
    };
    const db = await getDb();
    const result = await db.collection('savedWeekPlans').insertOne(weekPlan);
    return NextResponse.json({ weekPlan: { ...weekPlan, _id: result.insertedId } }, { status: 201 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ message: 'Could not save week plan' }, { status: 500 });
  }
}
