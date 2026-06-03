import { NextResponse } from 'next/server';
import { getDb } from '@/lib/mongodb';
import { createSession, publicUser, verifyPassword } from '@/lib/auth';

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
    const user = { id: String(userDoc._id), name: String(userDoc.name), email: String(userDoc.email), key: `user:${String(userDoc._id)}`, emailVerified: Boolean(userDoc.emailVerified), role: userDoc.role === 'admin' ? 'admin' : 'user' };
    if (!user.emailVerified && process.env.REQUIRE_EMAIL_VERIFICATION === 'true') {
      return NextResponse.json({ message: 'Please confirm your email before logging in' }, { status: 403 });
    }
    await createSession(user);
    return NextResponse.json({ user: publicUser(user) });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ message: 'Could not log in' }, { status: 500 });
  }
}
