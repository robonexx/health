import { NextResponse } from 'next/server';
import { getDb } from '@/lib/mongodb';
import { createSession, hashPassword, publicUser, roleForEmail } from '@/lib/auth';
import { sendWelcomeEmail } from '@/lib/email';

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
    const role = roleForEmail(email);
    const result = await db.collection('users').insertOne({
      name,
      email,
      passwordHash: hashPassword(password),
      emailVerified: true,
      role,
      createdAt: now,
      updatedAt: now,
    });

    const user = { id: String(result.insertedId), name, email, key: `user:${String(result.insertedId)}`, emailVerified: true, role };
    await sendWelcomeEmail({ to: email, name });
    await createSession(user);

    return NextResponse.json({ user: publicUser(user), message: 'Account created' }, { status: 201 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ message: 'Could not sign up' }, { status: 500 });
  }
}
