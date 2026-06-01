import { NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';
import { getDb } from '@/lib/mongodb';

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    if (!ObjectId.isValid(id)) {
      return NextResponse.json({ message: 'Invalid plan id' }, { status: 400 });
    }

    const body = await request.json();
    const { _id, createdAt, ...safeBody } = body;

    const db = await getDb();
    const result = await db.collection('mealPlans').findOneAndUpdate(
      { _id: new ObjectId(id) },
      { $set: { ...safeBody, updatedAt: new Date().toISOString() } },
      { returnDocument: 'after' }
    );

    if (!result) {
      return NextResponse.json({ message: 'Plan not found' }, { status: 404 });
    }

    return NextResponse.json({ plan: result });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ message: 'Could not update meal plan' }, { status: 500 });
  }
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    if (!ObjectId.isValid(id)) {
      return NextResponse.json({ message: 'Invalid plan id' }, { status: 400 });
    }

    const db = await getDb();
    await db.collection('mealPlans').deleteOne({ _id: new ObjectId(id) });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ message: 'Could not delete meal plan' }, { status: 500 });
  }
}
