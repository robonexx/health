import { NextResponse } from 'next/server';
import { getDb } from '@/lib/mongodb';
import type { MealPlan, PlanOwner } from '@/lib/types';

const owners: PlanOwner[] = ['shared', 'robert', 'erika'];
const lengths = ['day', 'week', 'ongoing'];

function isOwner(value: unknown): value is PlanOwner {
  return typeof value === 'string' && owners.includes(value as PlanOwner);
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
    const plans = await db.collection('mealPlans').find(query).sort({ date: 1, owner: 1 }).toArray();

    return NextResponse.json({ plans });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ message: 'Could not load meal plans' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as MealPlan;

    if (!isOwner(body.owner) || !body.date) {
      return NextResponse.json({ message: 'Owner and date are required' }, { status: 400 });
    }

    const now = new Date().toISOString();
    const plan: MealPlan = {
      owner: body.owner,
      title: body.title?.trim() || 'Ny matplan',
      date: body.date,
      length: lengths.includes(body.length) ? body.length : 'day',
      meals: Array.isArray(body.meals) ? body.meals : [],
      createdAt: now,
      updatedAt: now,
    };

    const db = await getDb();
    const result = await db.collection('mealPlans').insertOne(plan);

    return NextResponse.json({ plan: { ...plan, _id: result.insertedId } }, { status: 201 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ message: 'Could not create meal plan' }, { status: 500 });
  }
}
