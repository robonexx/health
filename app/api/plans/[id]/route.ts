import { NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';
import { getDb } from '@/lib/mongodb';
import { getFreshSessionUser } from '@/lib/auth';
import { canManageDocument } from '@/lib/permissions';

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getFreshSessionUser();
    if (!user) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    const { id } = await params;
    if (!ObjectId.isValid(id)) return NextResponse.json({ message: 'Invalid plan id' }, { status: 400 });

    const body = await request.json();
    const { _id, createdAt, owner, ...safeBody } = body;
    const db = await getDb();
    const existing = await db.collection('mealPlans').findOne({ _id: new ObjectId(id) });
    if (!existing) return NextResponse.json({ message: 'Plan not found' }, { status: 404 });
    if (!(await canManageDocument(db, existing, user))) return NextResponse.json({ message: 'Forbidden' }, { status: 403 });

    const result = await db.collection('mealPlans').findOneAndUpdate(
      { _id: new ObjectId(id) },
      { $set: { ...safeBody, updatedAt: new Date().toISOString() } },
      { returnDocument: 'after' }
    );
    return NextResponse.json({ plan: result });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ message: 'Could not update meal plan' }, { status: 500 });
  }
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getFreshSessionUser();
    if (!user) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    const { id } = await params;
    if (!ObjectId.isValid(id)) return NextResponse.json({ message: 'Invalid plan id' }, { status: 400 });
    const db = await getDb();
    const existing = await db.collection('mealPlans').findOne({ _id: new ObjectId(id) });
    if (!existing) return NextResponse.json({ message: 'Plan not found' }, { status: 404 });
    if (!(await canManageDocument(db, existing, user))) return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
    await db.collection('mealPlans').deleteOne({ _id: new ObjectId(id) });
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ message: 'Could not delete meal plan' }, { status: 500 });
  }
}
