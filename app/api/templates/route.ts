import { NextResponse } from 'next/server';
import { getDb } from '@/lib/mongodb';
import { getFreshSessionUser } from '@/lib/auth';
import { ownerQueryForUser, requireOwnerAccess } from '@/lib/permissions';
import type { PlanOwner, SavedMealPlan } from '@/lib/types';

const lengths = ['day', 'week', 'ongoing'];
function isOwner(value: unknown): value is PlanOwner { return typeof value === 'string' && value.trim().length > 0; }

export async function GET(request: Request) {
  try {
    const user = await getFreshSessionUser();
    if (!user) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    const owner = new URL(request.url).searchParams.get('owner');
    const db = await getDb();
    const query = await ownerQueryForUser(db, user, owner);
    const templates = await db.collection('savedMealPlans').find(query).sort({ createdAt: -1 }).toArray();
    return NextResponse.json({ templates });
  } catch (error) {
    console.error(error);
    if (error instanceof Error && error.message === 'FORBIDDEN') return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
    return NextResponse.json({ message: 'Could not load saved meal plans' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const user = await getFreshSessionUser();
    if (!user) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    const body = (await request.json()) as SavedMealPlan;
    if (!body.title || !isOwner(body.owner)) return NextResponse.json({ message: 'Title and owner are required' }, { status: 400 });
    const db = await getDb();
    await requireOwnerAccess(db, body.owner, user);
    const now = new Date().toISOString();
    const template: Omit<SavedMealPlan, '_id'> = { owner: body.owner, title: body.title.trim(), length: lengths.includes(body.length) ? body.length : 'day', meals: Array.isArray(body.meals) ? body.meals : [], createdBy: user.key, createdAt: now, updatedAt: now };
    const result = await db.collection('savedMealPlans').insertOne(template);
    return NextResponse.json({ template: { ...template, _id: result.insertedId } }, { status: 201 });
  } catch (error) {
    console.error(error);
    if (error instanceof Error && error.message === 'FORBIDDEN') return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
    return NextResponse.json({ message: 'Could not save meal plan template' }, { status: 500 });
  }
}
