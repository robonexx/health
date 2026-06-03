import { ObjectId, type Db } from 'mongodb';
import { getFreshSessionUser, type SessionUser } from '@/lib/auth';

export function unauthorizedResponse() {
  return Response.json({ message: 'Unauthorized' }, { status: 401 });
}

export function forbiddenResponse(message = 'You do not have permission to edit this') {
  return Response.json({ message }, { status: 403 });
}

export async function requireUser() {
  const user = await getFreshSessionUser();
  if (!user) throw new Error('UNAUTHORIZED');
  return user;
}

export function isUserOwner(owner: unknown, user: SessionUser) {
  return typeof owner === 'string' && owner === user.key;
}

export async function isGroupMember(db: Db, owner: unknown, user: SessionUser) {
  if (typeof owner !== 'string' || !owner.startsWith('group:')) return false;
  const groupId = owner.replace('group:', '');
  if (!ObjectId.isValid(groupId)) return false;
  const group = await db.collection('groups').findOne({ _id: new ObjectId(groupId), 'members.userId': user.id });
  return Boolean(group);
}

export async function canUseOwner(db: Db, owner: unknown, user: SessionUser) {
  // Private and group workspaces stay private even from admins.
  // Admin powers are reserved for public/community moderation routes.
  if (isUserOwner(owner, user)) return true;
  return isGroupMember(db, owner, user);
}

export async function requireOwnerAccess(db: Db, owner: unknown, user: SessionUser) {
  if (await canUseOwner(db, owner, user)) return;
  throw new Error('FORBIDDEN');
}

export async function accessibleOwners(db: Db, user: SessionUser) {
  const owners = [user.key];
  const groups = await db.collection('groups').find({ 'members.userId': user.id }).project({ _id: 1 }).toArray();
  owners.push(...groups.map((group) => `group:${String(group._id)}`));
  return owners;
}

export async function ownerQueryForUser(db: Db, user: SessionUser, owner?: string | null) {
  if (owner) {
    await requireOwnerAccess(db, owner, user);
    return { owner };
  }
  return { owner: { $in: await accessibleOwners(db, user) } };
}

export async function canManageDocument(db: Db, doc: any, user: SessionUser) {
  if (!doc) return false;
  if (doc.owner) return canUseOwner(db, doc.owner, user);
  if (doc.createdBy) return doc.createdBy === user.key;
  if (doc.publishedBy) return doc.publishedBy === user.key;
  return false;
}

export function handlePermissionError(error: unknown) {
  if (error instanceof Error && error.message === 'UNAUTHORIZED') {
    return Response.json({ message: 'Unauthorized' }, { status: 401 });
  }
  if (error instanceof Error && error.message === 'FORBIDDEN') {
    return Response.json({ message: 'You do not have permission to do this' }, { status: 403 });
  }
  return null;
}
