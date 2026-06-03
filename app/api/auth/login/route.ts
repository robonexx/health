import { NextResponse } from 'next/server';
import { getDb } from '@/lib/mongodb';
import { createSession, publicUser, verifyPassword, type SessionUser } from '@/lib/auth';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const email = String(body.email || '').trim().toLowerCase();
    const password = String(body.password || '');
    const db = await getDb();
    const userDoc = await db.collection('users').findOne({ email });
    if (!userDoc || !verifyPassword(password, String(userDoc.passwordHash || ''))) {
      return NextResponse.json({ message: 'Wrong email or password' }, { status: 401 });
    }
    const role: SessionUser['role'] = userDoc.role === 'admin' ? 'admin' : 'user';
    const user: SessionUser = { id: String(userDoc._id), name: String(userDoc.name), email: String(userDoc.email), key: `user:${String(userDoc._id)}`, emailVerified: Boolean(userDoc.emailVerified), role };
    await createSession(user);
    return NextResponse.json({ user: publicUser(user) });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ message: 'Could not log in' }, { status: 500 });
  }
}
