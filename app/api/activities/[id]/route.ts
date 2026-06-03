import { NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';
import { getDb } from '@/lib/mongodb';
import { getFreshSessionUser } from '@/lib/auth';
import { canManageDocument } from '@/lib/permissions';

function getId(id: string) { return ObjectId.isValid(id) ? new ObjectId(id) : null; }

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getFreshSessionUser();
    if (!user) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    const { id } = await params;
    const _id = getId(id);
    if (!_id) return NextResponse.json({ message: 'Invalid id' }, { status: 400 });
    const body = await request.json();
    const update = {
      ...(typeof body.title === 'string' ? { title: body.title.trim() } : {}),
      ...(typeof body.time === 'string' ? { time: body.time.trim() } : {}),
      ...(typeof body.comment === 'string' ? { comment: body.comment.trim() } : {}),
      ...(body.completedBy ? { completedBy: body.completedBy } : {}),
      updatedAt: new Date().toISOString(),
    };
    const db = await getDb();
    const existing = await db.collection('activities').findOne({ _id });
    if (!existing) return NextResponse.json({ message: 'Activity not found' }, { status: 404 });
    if (!(await canManageDocument(db, existing, user))) return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
    await db.collection('activities').updateOne({ _id }, { $set: update });
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ message: 'Could not update activity' }, { status: 500 });
  }
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getFreshSessionUser();
    if (!user) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    const { id } = await params;
    const _id = getId(id);
    if (!_id) return NextResponse.json({ message: 'Invalid id' }, { status: 400 });
    const db = await getDb();
    const existing = await db.collection('activities').findOne({ _id });
    if (!existing) return NextResponse.json({ message: 'Activity not found' }, { status: 404 });
    if (!(await canManageDocument(db, existing, user))) return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
    await db.collection('activities').deleteOne({ _id });
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ message: 'Could not delete activity' }, { status: 500 });
  }
}
