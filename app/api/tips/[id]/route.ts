import { NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';
import { getDb } from '@/lib/mongodb';
import { getFreshSessionUser } from '@/lib/auth';

function serializeTip(tip: any) {
  return { ...tip, _id: tip._id?.toString?.() || String(tip._id || '') };
}

async function canManageTip(db: Awaited<ReturnType<typeof getDb>>, id: string, user: NonNullable<Awaited<ReturnType<typeof getFreshSessionUser>>>) {
  const tip = await db.collection('healthTips').findOne({ _id: new ObjectId(id) });
  if (!tip) return { ok: false as const, status: 404, message: 'Tip not found' };
  if (user.role === 'admin' || tip.createdBy === user.key) return { ok: true as const, tip };
  return { ok: false as const, status: 403, message: 'You can only edit or delete your own health tips' };
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getFreshSessionUser();
    if (!user) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

    const { id } = await params;
    if (!ObjectId.isValid(id)) return NextResponse.json({ message: 'Invalid tip id' }, { status: 400 });

    const body = await request.json();
    const allowed = {
      ...(typeof body.title === 'string' ? { title: body.title.trim() } : {}),
      ...(typeof body.body === 'string' ? { body: body.body.trim() } : {}),
      ...(typeof body.category === 'string' ? { category: body.category } : {}),
      updatedAt: new Date().toISOString(),
    };

    const db = await getDb();
    const access = await canManageTip(db, id, user);
    if (!access.ok) return NextResponse.json({ message: access.message }, { status: access.status });

    const result = await db.collection('healthTips').findOneAndUpdate(
      { _id: new ObjectId(id) },
      { $set: allowed },
      { returnDocument: 'after' }
    );

    return NextResponse.json({ tip: serializeTip(result) });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ message: 'Could not update health tip' }, { status: 500 });
  }
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getFreshSessionUser();
    if (!user) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

    const { id } = await params;
    if (!ObjectId.isValid(id)) return NextResponse.json({ message: 'Invalid tip id' }, { status: 400 });

    const db = await getDb();
    const access = await canManageTip(db, id, user);
    if (!access.ok) return NextResponse.json({ message: access.message }, { status: access.status });

    await db.collection('healthTips').deleteOne({ _id: new ObjectId(id) });
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ message: 'Could not delete health tip' }, { status: 500 });
  }
}
