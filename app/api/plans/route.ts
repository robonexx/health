import { NextResponse } from 'next/server';
import { getDb } from '@/lib/mongodb';
import { getFreshSessionUser } from '@/lib/auth';
import { ownerQueryForUser, requireOwnerAccess } from '@/lib/permissions';
import type { MealPlan, PlanOwner } from '@/lib/types';

const lengths = ['day', 'week', 'ongoing'];
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

    const plans = await db.collection('mealPlans').find(query).sort({ date: 1, owner: 1 }).toArray();
    return NextResponse.json({ plans });
  } catch (error) {
    console.error(error);
    if (error instanceof Error && error.message === 'FORBIDDEN') return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
    return NextResponse.json({ message: 'Could not load meal plans' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const user = await getFreshSessionUser();
    if (!user) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    const body = (await request.json()) as MealPlan;

    if (!isOwner(body.owner) || !body.date) return NextResponse.json({ message: 'Owner and date are required' }, { status: 400 });

    const db = await getDb();
    await requireOwnerAccess(db, body.owner, user);
    const now = new Date().toISOString();
    const plan: Omit<MealPlan, '_id'> = {
      owner: body.owner,
      title: body.title?.trim() || 'Ny matplan',
      date: body.date,
      length: lengths.includes(body.length) ? body.length : 'day',
      meals: Array.isArray(body.meals) ? body.meals : [],
      createdAt: now,
      updatedAt: now,
    };
    const result = await db.collection('mealPlans').insertOne(plan);
    return NextResponse.json({ plan: { ...plan, _id: result.insertedId } }, { status: 201 });
  } catch (error) {
    console.error(error);
    if (error instanceof Error && error.message === 'FORBIDDEN') return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
    return NextResponse.json({ message: 'Could not create meal plan' }, { status: 500 });
  }
}
