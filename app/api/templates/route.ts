import { NextResponse } from 'next/server';
import { getDb } from '@/lib/mongodb';
import type { PlanOwner, SavedMealPlan } from '@/lib/types';

const lengths = ['day', 'week', 'ongoing'];
function isOwner(value: unknown): value is PlanOwner {
  return typeof value === 'string' && value.trim().length > 0;
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const owner = searchParams.get('owner');
    const query: Record<string, unknown> = {};
    if (owner && isOwner(owner)) query.owner = owner;

    const db = await getDb();
    const templates = await db.collection('savedMealPlans').find(query).sort({ createdAt: -1 }).toArray();
    return NextResponse.json({ templates });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ message: 'Could not load saved meal plans' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as SavedMealPlan;
    if (!body.title || !isOwner(body.owner) || !body.createdBy) {
      return NextResponse.json({ message: 'Title, owner and createdBy are required' }, { status: 400 });
    }

    const now = new Date().toISOString();
    const template: Omit<SavedMealPlan, '_id'> = {
      owner: body.owner,
      title: body.title.trim(),
      length: lengths.includes(body.length) ? body.length : 'day',
      meals: Array.isArray(body.meals) ? body.meals : [],
      createdBy: body.createdBy,
      createdAt: now,
      updatedAt: now,
    };

    const db = await getDb();
    const result = await db.collection('savedMealPlans').insertOne(template);
    return NextResponse.json({ template: { ...template, _id: result.insertedId } }, { status: 201 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ message: 'Could not save meal plan template' }, { status: 500 });
  }
}
