import { NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';
import { getDb } from '@/lib/mongodb';
import { getFreshSessionUser } from '@/lib/auth';

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getFreshSessionUser();
    if (!user) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    const { id } = await params;
    if (!ObjectId.isValid(id)) return NextResponse.json({ message: 'Invalid id' }, { status: 400 });
    const body = await request.json();
    const db = await getDb();

    if (body.action === 'copy') {
      await db.collection('publicSharedPlans').updateOne({ _id: new ObjectId(id), visibility: 'public' }, { $inc: { copies: 1 }, $set: { updatedAt: new Date().toISOString() } });
      return NextResponse.json({ ok: true });
    }

    if (body.action === 'like') {
      await db.collection('publicSharedPlans').updateOne({ _id: new ObjectId(id), visibility: 'public' }, { $inc: { likes: 1 }, $set: { updatedAt: new Date().toISOString() } });
      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ message: 'Unknown action' }, { status: 400 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ message: 'Could not update shared plan' }, { status: 500 });
  }
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getFreshSessionUser();
    if (!user) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    const { id } = await params;
    if (!ObjectId.isValid(id)) return NextResponse.json({ message: 'Invalid id' }, { status: 400 });
    const db = await getDb();
    const query = user.role === 'admin'
      ? { _id: new ObjectId(id) }
      : { _id: new ObjectId(id), publishedBy: user.key };
    const result = await db.collection('publicSharedPlans').deleteOne(query);
    if (!result.deletedCount) return NextResponse.json({ message: 'Not found' }, { status: 404 });
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ message: 'Could not delete shared plan' }, { status: 500 });
  }
}
