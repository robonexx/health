import { NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';
import { getDb } from '@/lib/mongodb';
import { clearSession, requireSessionUser } from '@/lib/auth';
import type { HealthGroupMember } from '@/lib/types';

export async function DELETE() {
  try {
    const user = await requireSessionUser();
    if (!ObjectId.isValid(user.id)) {
      return NextResponse.json({ message: 'Invalid user session' }, { status: 400 });
    }

    const db = await getDb();
    const userKey = user.key;
    const deletedUserKey = `deleted:${user.id}`;
    const now = new Date().toISOString();

    // Remove private data owned by the user. Group-owned plans stay because they belong to shared workspaces.
    await Promise.all([
      db.collection('mealPlans').deleteMany({ owner: userKey }),
      db.collection('activities').deleteMany({ owner: userKey }),
      db.collection('savedMeals').deleteMany({ owner: userKey }),
      db.collection('savedMealPlans').deleteMany({ owner: userKey }),
      db.collection('savedActivities').deleteMany({ owner: userKey }),
      db.collection('savedDayPlans').deleteMany({ owner: userKey }),
      db.collection('savedWeekPlans').deleteMany({ owner: userKey }),
    ]);

    // Remove health tips created by this user. Public shared plans are kept but anonymized below.
    await db.collection('healthTips').deleteMany({ createdBy: userKey });

    // Keep public/community plans available for people who copied or want to keep using them,
    // but remove the deleted user's identity from those plans.
    await db.collection('publicSharedPlans').updateMany(
      { publishedBy: userKey },
      {
        $set: {
          publishedBy: deletedUserKey,
          publishedByName: 'Deleted user',
          sourceOwner: deletedUserKey,
          updatedAt: now,
        },
      }
    );

    // Remove the user from group member lists. If they owned a group with other members,
    // transfer ownership to the next remaining member. Delete empty groups.
    const groups = await db.collection('groups').find({ 'members.userId': user.id }).toArray();
    for (const group of groups) {
      const members: HealthGroupMember[] = Array.isArray(group.members) ? group.members as HealthGroupMember[] : [];
      const remainingMembers = members.filter((member) => member.userId !== user.id);

      if (remainingMembers.length === 0) {
        await db.collection('groups').deleteOne({ _id: group._id });
        continue;
      }

      let nextOwnerId = group.ownerId;
      let nextMembers = remainingMembers;

      if (group.ownerId === user.id) {
        nextOwnerId = remainingMembers[0].userId;
        nextMembers = remainingMembers.map((member, index) => ({
          ...member,
          role: index === 0 ? 'owner' : member.role === 'owner' ? 'member' : member.role,
        }));
      }

      await db.collection('groups').updateOne(
        { _id: group._id },
        {
          $set: {
            ownerId: nextOwnerId,
            members: nextMembers,
            updatedAt: now,
          },
        }
      );
    }

    await db.collection('users').deleteOne({ _id: new ObjectId(user.id) });
    await clearSession();

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ message: 'Could not delete account' }, { status: 500 });
  }
}
