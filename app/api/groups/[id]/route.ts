import { NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';
import { getDb } from '@/lib/mongodb';
import { getFreshSessionUser } from '@/lib/auth';

async function getGroup(id: string) {
  if (!ObjectId.isValid(id)) return null;
  const db = await getDb();
  return db.collection('groups').findOne({ _id: new ObjectId(id) });
}

function isMember(group: any, userId: string) {
  return Boolean((group.members || []).some((member: any) => member.userId === userId));
}

function isOwner(group: any, userId: string) {
  return group.ownerId === userId || Boolean((group.members || []).some((member: any) => member.userId === userId && member.role === 'owner'));
}

function memberForUser(user: any) {
  return { userId: user.id, name: user.name, email: user.email.toLowerCase(), role: 'member', joinedAt: new Date().toISOString() };
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getFreshSessionUser();
    if (!user) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    const { id } = await params;
    if (!ObjectId.isValid(id)) return NextResponse.json({ message: 'Invalid group id' }, { status: 400 });

    const db = await getDb();
    const group = await getGroup(id);
    if (!group) return NextResponse.json({ message: 'Group not found' }, { status: 404 });

    const body = await request.json();
    const action = String(body.action || '');
    const now = new Date().toISOString();
    const groupId = new ObjectId(id);

    if (action === 'invite') {
      if (!isOwner(group, user.id)) return NextResponse.json({ message: 'Only the group owner can invite members' }, { status: 403 });
      const email = String(body.email || '').trim().toLowerCase();
      if (!email.includes('@')) return NextResponse.json({ message: 'Valid email is required' }, { status: 400 });
      if ((group.members || []).length >= 10) return NextResponse.json({ message: 'Groups can have max 10 members' }, { status: 400 });
      if ((group.members || []).some((member: any) => String(member.email).toLowerCase() === email)) return NextResponse.json({ message: 'Already in group' }, { status: 409 });
      if ((group.invites || []).some((invite: any) => invite.email === email && invite.status === 'pending')) return NextResponse.json({ message: 'Invitation already sent' }, { status: 409 });

      const invite = { email, invitedBy: user.id, invitedByName: user.name, status: 'pending', createdAt: now };
      const updated = await db.collection('groups').findOneAndUpdate(
        { _id: groupId, ownerId: user.id },
        { $push: { invites: invite as never }, $set: { updatedAt: now } },
        { returnDocument: 'after' }
      );
      return NextResponse.json({ group: updated });
    }

    if (action === 'acceptInvite') {
      const email = user.email.toLowerCase();
      const pendingInvite = (group.invites || []).find((invite: any) => invite.email === email && invite.status === 'pending');
      if (!pendingInvite) return NextResponse.json({ message: 'Invitation not found' }, { status: 404 });
      if ((group.members || []).length >= 10) return NextResponse.json({ message: 'Groups can have max 10 members' }, { status: 400 });
      const updated = await db.collection('groups').findOneAndUpdate(
        { _id: groupId, invites: { $elemMatch: { email, status: 'pending' } } },
        {
          $pull: { invites: { email, status: 'pending' } as never },
          $push: { members: memberForUser(user) as never },
          $set: { updatedAt: now },
        },
        { returnDocument: 'after' }
      );
      return NextResponse.json({ group: updated });
    }

    if (action === 'declineInvite') {
      const email = user.email.toLowerCase();
      const updated = await db.collection('groups').findOneAndUpdate(
        { _id: groupId, invites: { $elemMatch: { email, status: 'pending' } } },
        { $set: { 'invites.$.status': 'declined', 'invites.$.respondedAt': now, updatedAt: now } },
        { returnDocument: 'after' }
      );
      if (!updated) return NextResponse.json({ message: 'Invitation not found' }, { status: 404 });
      return NextResponse.json({ group: updated });
    }

    if (action === 'leave') {
      if (!isMember(group, user.id)) return NextResponse.json({ message: 'You are not a member of this group' }, { status: 403 });
      const remaining = (group.members || []).filter((member: any) => member.userId !== user.id);
      if (!remaining.length) {
        await db.collection('groups').deleteOne({ _id: groupId });
        return NextResponse.json({ ok: true, deleted: true });
      }
      const nextOwner = group.ownerId === user.id ? remaining[0] : null;
      const members = remaining.map((member: any) => nextOwner && member.userId === nextOwner.userId ? { ...member, role: 'owner' } : member);
      const update: any = { members, updatedAt: now };
      if (nextOwner) update.ownerId = nextOwner.userId;
      const updated = await db.collection('groups').findOneAndUpdate(
        { _id: groupId, 'members.userId': user.id },
        { $set: update },
        { returnDocument: 'after' }
      );
      return NextResponse.json({ group: updated });
    }

    if (action === 'removeMember') {
      if (!isOwner(group, user.id)) return NextResponse.json({ message: 'Only the group owner can remove members' }, { status: 403 });
      const memberId = String(body.userId || '');
      if (!memberId) return NextResponse.json({ message: 'Member id is required' }, { status: 400 });
      if (memberId === user.id) return NextResponse.json({ message: 'Use leave group instead' }, { status: 400 });
      const memberToRemove = (group.members || []).find((member: any) => member.userId === memberId);
      if (!memberToRemove) return NextResponse.json({ message: 'Member not found' }, { status: 404 });
      if (memberToRemove.role === 'owner' || memberToRemove.userId === group.ownerId) return NextResponse.json({ message: 'Owner cannot be removed' }, { status: 400 });
      const updated = await db.collection('groups').findOneAndUpdate(
        { _id: groupId, ownerId: user.id },
        { $pull: { members: { userId: memberId } as never }, $set: { updatedAt: now } },
        { returnDocument: 'after' }
      );
      return NextResponse.json({ group: updated });
    }

    if (action === 'cancelInvite') {
      if (!isOwner(group, user.id)) return NextResponse.json({ message: 'Only the group owner can cancel invitations' }, { status: 403 });
      const email = String(body.email || '').trim().toLowerCase();
      const updated = await db.collection('groups').findOneAndUpdate(
        { _id: groupId, ownerId: user.id },
        { $pull: { invites: { email, status: 'pending' } as never }, $set: { updatedAt: now } },
        { returnDocument: 'after' }
      );
      return NextResponse.json({ group: updated });
    }

    if (action === 'rename') {
      if (!isOwner(group, user.id)) return NextResponse.json({ message: 'Only the group owner can rename the group' }, { status: 403 });
      const name = String(body.name || '').trim();
      const description = String(body.description || '').trim();
      if (name.length < 2) return NextResponse.json({ message: 'Group name is required' }, { status: 400 });
      const updated = await db.collection('groups').findOneAndUpdate(
        { _id: groupId, ownerId: user.id },
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
