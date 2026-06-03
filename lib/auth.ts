import { cookies } from 'next/headers';
import { createHmac, randomBytes, pbkdf2Sync, timingSafeEqual } from 'crypto';
import { ObjectId } from 'mongodb';
import { getDb } from '@/lib/mongodb';
import type { UserRole } from '@/lib/types';

export type SessionUser = {
  id: string;
  name: string;
  email: string;
  key: string;
  emailVerified: boolean;
  role?: UserRole;
};

const SESSION_COOKIE = 'healthapp_session';
const TOKEN_TTL_MS = 1000 * 60 * 60 * 24 * 7;

function secret() {
  return process.env.JWT_SECRET || 'dev-healthapp-secret-change-me';
}

export function roleForEmail(email: string): UserRole {
  const admins = (process.env.ADMIN_EMAILS || '')
    .split(',')
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean);
  return admins.includes(email.trim().toLowerCase()) ? 'admin' : 'user';
}

function base64url(input: Buffer | string) {
  return Buffer.from(input).toString('base64url');
}

function signPayload(payload: object) {
  const body = base64url(JSON.stringify(payload));
  const signature = createHmac('sha256', secret()).update(body).digest('base64url');
  return `${body}.${signature}`;
}

function verifyPayload<T>(token?: string): T | null {
  if (!token || !token.includes('.')) return null;
  const [body, signature] = token.split('.');
  const expected = createHmac('sha256', secret()).update(body).digest('base64url');
  if (!timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) return null;
  try {
    const payload = JSON.parse(Buffer.from(body, 'base64url').toString()) as T & { exp?: number };
    if (payload.exp && payload.exp < Date.now()) return null;
    return payload;
  } catch {
    return null;
  }
}

export function hashPassword(password: string) {
  const salt = randomBytes(16).toString('hex');
  const hash = pbkdf2Sync(password, salt, 120000, 64, 'sha512').toString('hex');
  return `${salt}:${hash}`;
}

export function verifyPassword(password: string, stored: string) {
  const [salt, hash] = stored.split(':');
  if (!salt || !hash) return false;
  const candidate = pbkdf2Sync(password, salt, 120000, 64, 'sha512').toString('hex');
  return timingSafeEqual(Buffer.from(hash, 'hex'), Buffer.from(candidate, 'hex'));
}

export function makeEmailToken(userId: string, email: string) {
  return signPayload({ type: 'verify-email', userId, email, exp: Date.now() + TOKEN_TTL_MS });
}

export function readEmailToken(token: string) {
  return verifyPayload<{ type: string; userId: string; email: string; exp: number }>(token);
}

export async function createSession(user: SessionUser) {
  const token = signPayload({ type: 'session', ...user, exp: Date.now() + TOKEN_TTL_MS });
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 60 * 60 * 24 * 7,
  });
}

export async function clearSession() {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE);
}

export async function getSessionUser(): Promise<SessionUser | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  const session = verifyPayload<SessionUser & { type: string; exp: number }>(token);
  if (!session || session.type !== 'session') return null;
  return { id: session.id, name: session.name, email: session.email, key: session.key, emailVerified: Boolean(session.emailVerified), role: session.role || 'user' };
}

export async function requireSessionUser() {
  const session = await getSessionUser();
  if (!session) throw new Error('Unauthorized');
  return session;
}

export async function getFreshSessionUser(): Promise<SessionUser | null> {
  const session = await getSessionUser();
  if (!session || !ObjectId.isValid(session.id)) return null;
  const db = await getDb();
  const user = await db.collection('users').findOne({ _id: new ObjectId(session.id) });
  if (!user) return null;
  return {
    id: String(user._id),
    name: String(user.name || ''),
    email: String(user.email || ''),
    key: `user:${String(user._id)}`,
    emailVerified: Boolean(user.emailVerified),
    role: (user.role === 'admin' ? 'admin' : 'user'),
  };
}

export function publicUser(user: SessionUser) {
  return { id: user.id, name: user.name, email: user.email, key: user.key, emailVerified: user.emailVerified, role: user.role || 'user' };
}

export async function requireAdminUser() {
  const user = await getFreshSessionUser();
  if (!user || user.role !== 'admin') throw new Error('Admin only');
  return user;
}
