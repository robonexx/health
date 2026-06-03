import { NextResponse } from 'next/server';
import { getDb } from '@/lib/mongodb';
import { createSession, hashPassword, makeEmailToken, publicUser } from '@/lib/auth';
import { sendVerificationEmail } from '@/lib/email';

function appUrl(request: Request) {
  return process.env.NEXT_PUBLIC_APP_URL || new URL(request.url).origin;
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const name = String(body.name || '').trim();
    const email = String(body.email || '').trim().toLowerCase();
    const password = String(body.password || '');

    if (name.length < 2) return NextResponse.json({ message: 'Name is required' }, { status: 400 });
    if (!email.includes('@')) return NextResponse.json({ message: 'Valid email is required' }, { status: 400 });
    if (password.length < 8) return NextResponse.json({ message: 'Password must be at least 8 characters' }, { status: 400 });

    const db = await getDb();
    const existing = await db.collection('users').findOne({ email });
    if (existing) return NextResponse.json({ message: 'Email already exists' }, { status: 409 });

    const now = new Date().toISOString();
    const result = await db.collection('users').insertOne({
      name,
      email,
      passwordHash: hashPassword(password),
      emailVerified: false,
      createdAt: now,
      updatedAt: now,
    });

    const user = { id: String(result.insertedId), name, email, key: `user:${String(result.insertedId)}`, emailVerified: false };
    const token = makeEmailToken(user.id, email);
    const confirmationUrl = `${appUrl(request)}/verify-email?token=${encodeURIComponent(token)}`;
    await sendVerificationEmail({ to: email, name, url: confirmationUrl });
    await createSession(user);

    return NextResponse.json({ user: publicUser(user), confirmationUrl: process.env.NODE_ENV === 'development' ? confirmationUrl : undefined }, { status: 201 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ message: 'Could not sign up' }, { status: 500 });
  }
}
