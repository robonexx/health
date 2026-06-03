import { NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';
import { getDb } from '@/lib/mongodb';
import { createSession, readEmailToken } from '@/lib/auth';

export async function POST(request: Request) {
  try {
    const { token } = await request.json();
    const payload = readEmailToken(String(token || ''));
    if (!payload || payload.type !== 'verify-email' || !ObjectId.isValid(payload.userId)) {
      return NextResponse.json({ message: 'Invalid or expired confirmation link' }, { status: 400 });
    }
    const db = await getDb();
    const result = await db.collection('users').findOneAndUpdate(
      { _id: new ObjectId(payload.userId), email: payload.email },
      { $set: { emailVerified: true, updatedAt: new Date().toISOString() } },
      { returnDocument: 'after' }
    );
    if (!result) return NextResponse.json({ message: 'User not found' }, { status: 404 });
    const user = { id: String(result._id), name: String(result.name), email: String(result.email), key: `user:${String(result._id)}`, emailVerified: true };
    await createSession(user);
    return NextResponse.json({ user });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ message: 'Could not verify email' }, { status: 500 });
  }
}
