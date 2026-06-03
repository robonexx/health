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
    if (!ObjectId.isValid(id)) return NextResponse.json({ message: 'Invalid meal id' }, { status: 400 });
    const body = await request.json();
    const update = {
      ...(typeof body.title === 'string' ? { title: body.title.trim() } : {}),
      ...(typeof body.time === 'string' ? { time: body.time.trim() } : {}),
      ...(Array.isArray(body.items) ? { items: body.items.map((item: unknown) => String(item).trim()).filter(Boolean) } : {}),
      ...(typeof body.notes === 'string' ? { notes: body.notes.trim() } : {}),
      updatedAt: new Date().toISOString(),
    };
    const db = await getDb();
    const existing = await db.collection('savedMeals').findOne({ _id: new ObjectId(id) });
    if (!existing) return NextResponse.json({ message: 'Meal not found' }, { status: 404 });
    if (!(await canManageDocument(db, existing, user))) return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
    const result = await db.collection('savedMeals').findOneAndUpdate({ _id: new ObjectId(id) }, { $set: update }, { returnDocument: 'after' });
    return NextResponse.json({ meal: result });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ message: 'Could not update saved meal' }, { status: 500 });
  }
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getFreshSessionUser();
    if (!user) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    const { id } = await params;
    if (!ObjectId.isValid(id)) return NextResponse.json({ message: 'Invalid meal id' }, { status: 400 });
    const db = await getDb();
    const existing = await db.collection('savedMeals').findOne({ _id: new ObjectId(id) });
    if (!existing) return NextResponse.json({ message: 'Meal not found' }, { status: 404 });
    if (!(await canManageDocument(db, existing, user))) return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
    await db.collection('savedMeals').deleteOne({ _id: new ObjectId(id) });
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ message: 'Could not delete saved meal' }, { status: 500 });
  }
}
