import { NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';
import { getDb } from '@/lib/mongodb';
import { getFreshSessionUser } from '@/lib/auth';

async function getGroupForUser(id: string, userId: string) {
  if (!ObjectId.isValid(id)) return null;
  const db = await getDb();
  return db.collection('groups').findOne({ _id: new ObjectId(id), 'members.userId': userId });
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getFreshSessionUser();
    if (!user) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    const { id } = await params;
    const db = await getDb();
    const group = await getGroupForUser(id, user.id);
    if (!group) return NextResponse.json({ message: 'Group not found' }, { status: 404 });

    const body = await request.json();
    const action = String(body.action || '');
    const now = new Date().toISOString();

    if (action === 'invite') {
      const email = String(body.email || '').trim().toLowerCase();
      if (!email.includes('@')) return NextResponse.json({ message: 'Valid email is required' }, { status: 400 });
      if ((group.members || []).length >= 10) return NextResponse.json({ message: 'Groups can have max 10 members' }, { status: 400 });
      if ((group.members || []).some((member: any) => member.email === email)) return NextResponse.json({ message: 'Already in group' }, { status: 409 });
      const invited = await db.collection('users').findOne({ email });
      if (!invited) return NextResponse.json({ message: 'That friend needs to create an account first' }, { status: 404 });
      const member = { userId: String(invited._id), name: String(invited.name), email: String(invited.email), role: 'member', joinedAt: now };
      const updated = await db.collection('groups').findOneAndUpdate(
        { _id: new ObjectId(id), 'members.userId': user.id },
        { $push: { members: member as never }, $set: { updatedAt: now } },
        { returnDocument: 'after' }
      );
      return NextResponse.json({ group: updated });
    }

    if (action === 'rename') {
      const name = String(body.name || '').trim();
      const description = String(body.description || '').trim();
      if (name.length < 2) return NextResponse.json({ message: 'Group name is required' }, { status: 400 });
      const updated = await db.collection('groups').findOneAndUpdate(
        { _id: new ObjectId(id), 'members.userId': user.id },
        { $set: { name, description, updatedAt: now } },
        { returnDocument: 'after' }
      );
      return NextResponse.json({ group: updated });
    }

    return NextResponse.json({ message: 'Unknown action' }, { status: 400 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ message: 'Could not update group' }, { status: 500 });
  }
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getFreshSessionUser();
    if (!user) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    const { id } = await params;
    if (!ObjectId.isValid(id)) return NextResponse.json({ message: 'Invalid group id' }, { status: 400 });
    const db = await getDb();
    const group = await db.collection('groups').findOne({ _id: new ObjectId(id), ownerId: user.id });
    if (!group) return NextResponse.json({ message: 'Only owner can delete the group' }, { status: 403 });
    await db.collection('groups').deleteOne({ _id: new ObjectId(id), ownerId: user.id });
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ message: 'Could not delete group' }, { status: 500 });
  }
}
