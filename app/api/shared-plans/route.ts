import { NextResponse } from 'next/server';
import { getDb } from '@/lib/mongodb';
import { getFreshSessionUser } from '@/lib/auth';
import type { LanguageCode, PublicSharedPlan, SharedPlanType } from '@/lib/types';

const types: SharedPlanType[] = ['meal', 'day', 'week', 'month', 'training'];
const languages: LanguageCode[] = ['sv', 'en', 'fi', 'es', 'pt', 'ja', 'zh'];

function isType(value: unknown): value is SharedPlanType {
  return typeof value === 'string' && types.includes(value as SharedPlanType);
}

function isLanguage(value: unknown): value is LanguageCode {
  return typeof value === 'string' && languages.includes(value as LanguageCode);
}

function serialize(plan: any) {
  return { ...plan, _id: String(plan._id) };
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type');
    const tag = searchParams.get('tag');
    const query: Record<string, unknown> = { visibility: 'public' };
    if (type && isType(type)) query.type = type;
    if (tag) query.tags = tag;

    const db = await getDb();
    const plans = await db.collection('publicSharedPlans').find(query).sort({ isFeatured: -1, createdAt: -1 }).limit(80).toArray();
    return NextResponse.json({ plans: plans.map(serialize) });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ message: 'Could not load shared plans' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const user = await getFreshSessionUser();
    if (!user) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

    const body = (await request.json()) as Partial<PublicSharedPlan>;
    if (!isType(body.type) || !body.title?.trim()) {
      return NextResponse.json({ message: 'Type and title are required' }, { status: 400 });
    }

    const now = new Date().toISOString();
    const plan: Omit<PublicSharedPlan, '_id'> = {
      type: body.type,
      visibility: 'public',
      title: body.title.trim(),
      description: body.description?.trim() || '',
      tags: Array.isArray(body.tags) ? body.tags.map((tag) => String(tag).trim().toLowerCase()).filter(Boolean).slice(0, 8) : [],
      language: isLanguage(body.language) ? body.language : 'en',
      sourceOwner: body.sourceOwner || user.key,
      publishedBy: user.key,
      publishedByName: user.name,
      meals: Array.isArray(body.meals) ? body.meals : undefined,
      activities: Array.isArray(body.activities) ? body.activities : undefined,
      dayPlan: body.dayPlan,
      weekPlan: body.weekPlan,
      monthPlan: body.monthPlan,
      copies: 0,
      likes: 0,
      isFeatured: false,
      createdAt: now,
      updatedAt: now,
    };

    const db = await getDb();
    const result = await db.collection('publicSharedPlans').insertOne(plan);
    return NextResponse.json({ plan: { ...plan, _id: String(result.insertedId) } }, { status: 201 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ message: 'Could not publish shared plan' }, { status: 500 });
  }
}
