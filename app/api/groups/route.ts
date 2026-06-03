import { NextResponse } from 'next/server';
import { getDb } from '@/lib/mongodb';
import { getFreshSessionUser } from '@/lib/auth';

export async function GET() {
  try {
    const user = await getFreshSessionUser();
    if (!user) return NextResponse.json({ groups: [], invites: [] }, { status: 401 });
    const db = await getDb();
    const email = user.email.toLowerCase();
    const [groups, invitedGroups] = await Promise.all([
      db.collection('groups').find({ 'members.userId': user.id }).sort({ updatedAt: -1 }).toArray(),
      db.collection('groups').find({
        'members.userId': { $ne: user.id },
        invites: { $elemMatch: { email, status: 'pending' } },
      }).sort({ updatedAt: -1 }).toArray(),
    ]);

    const invites = invitedGroups.map((group) => {
      const invite = (group.invites || []).find((item: any) => item.email === email && item.status === 'pending');
      return { group, invite };
    }).filter((item) => item.invite);

    return NextResponse.json({ groups, invites });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ message: 'Could not load groups' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const user = await getFreshSessionUser();
    if (!user) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    const body = await request.json();
    const name = String(body.name || '').trim();
    const description = String(body.description || '').trim();
    if (name.length < 2) return NextResponse.json({ message: 'Group name is required' }, { status: 400 });
    const now = new Date().toISOString();
    const group = {
      name,
      description,
      ownerId: user.id,
      members: [{ userId: user.id, name: user.name, email: user.email.toLowerCase(), role: 'owner', joinedAt: now }],
      invites: [],
      createdAt: now,
      updatedAt: now,
    };
    const db = await getDb();
    const result = await db.collection('groups').insertOne(group);
    return NextResponse.json({ group: { ...group, _id: result.insertedId } }, { status: 201 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ message: 'Could not create group' }, { status: 500 });
  }
}
