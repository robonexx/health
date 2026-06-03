import { NextResponse } from 'next/server';
import { getDb } from '@/lib/mongodb';
import { getFreshSessionUser } from '@/lib/auth';
import { ownerQueryForUser, requireOwnerAccess } from '@/lib/permissions';
import type { PlanOwner, SavedMeal } from '@/lib/types';

function isOwner(value: unknown): value is PlanOwner { return typeof value === 'string' && value.trim().length > 0; }

export async function GET(request: Request) {
  try {
    const user = await getFreshSessionUser();
    if (!user) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    const { searchParams } = new URL(request.url);
    const owner = searchParams.get('owner');
    const db = await getDb();
    const query = await ownerQueryForUser(db, user, owner);
    const meals = await db.collection('savedMeals').find(query).sort({ createdAt: -1 }).toArray();
    return NextResponse.json({ meals });
  } catch (error) {
    console.error(error);
    if (error instanceof Error && error.message === 'FORBIDDEN') return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
    return NextResponse.json({ message: 'Could not load saved meals' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const user = await getFreshSessionUser();
    if (!user) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    const body = (await request.json()) as SavedMeal;
    if (!isOwner(body.owner) || !body.title?.trim()) return NextResponse.json({ message: 'Owner and title are required' }, { status: 400 });
    const db = await getDb();
    await requireOwnerAccess(db, body.owner, user);
    const now = new Date().toISOString();
    const meal: Omit<SavedMeal, '_id'> = {
      owner: body.owner,
      title: body.title.trim(),
      time: body.time?.trim() || '',
      items: Array.isArray(body.items) ? body.items.map((item) => String(item).trim()).filter(Boolean) : [],
      notes: body.notes?.trim() || '',
      createdBy: user.key,
      createdAt: now,
      updatedAt: now,
    };
    const result = await db.collection('savedMeals').insertOne(meal);
    return NextResponse.json({ meal: { ...meal, _id: result.insertedId } }, { status: 201 });
  } catch (error) {
    console.error(error);
    if (error instanceof Error && error.message === 'FORBIDDEN') return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
    return NextResponse.json({ message: 'Could not save meal' }, { status: 500 });
  }
}
