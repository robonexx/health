import { NextResponse } from 'next/server';
import { getFreshSessionUser, publicUser } from '@/lib/auth';

export async function GET() {
  const user = await getFreshSessionUser();
  return NextResponse.json({ user: user ? publicUser(user) : null });
}
