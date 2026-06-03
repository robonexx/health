export type UserKey = string;
export type PlanOwner = string;
export type PlanLength = 'day' | 'week' | 'ongoing';
export type DayPlanKind = 'food' | 'training' | 'full';

export type UserRole = 'user' | 'admin';
export type LanguageCode = 'sv' | 'en' | 'fi' | 'es' | 'pt' | 'fr' | 'ja' | 'zh';
export type SharedPlanType = 'meal' | 'day' | 'week' | 'month' | 'training';
export type SharedVisibility = 'private' | 'group' | 'public';

export type AppUser = {
  _id?: string;
  name: string;
  email: string;
  key: UserKey;
  emailVerified?: boolean;
  role?: UserRole;
  createdAt?: string;
  updatedAt?: string;
};

export type HealthGroupMember = {
  userId: string;
  name: string;
  email: string;
  role: 'owner' | 'member';
  joinedAt: string;
};

export type HealthGroup = {
  _id?: string;
  name: string;
  description?: string;
  ownerId: string;
  members: HealthGroupMember[];
  createdAt?: string;
  updatedAt?: string;
};

export type Meal = {
  id: string;
  title: string;
  time?: string;
  items: string[];
  notes?: string;
  completedBy: Partial<Record<UserKey, boolean>>;
};

export type MealPlan = {
  _id?: string;
  owner: PlanOwner;
  title: string;
  date: string;
  length: PlanLength;
  meals: Meal[];
  createdAt?: string;
  updatedAt?: string;
};

export type SavedMealPlan = {
  _id?: string;
  owner: PlanOwner;
  title: string;
  length: PlanLength;
  meals: Meal[];
  createdBy: UserKey;
  createdAt?: string;
  updatedAt?: string;
};

export type SavedMeal = {
  _id?: string;
  owner: PlanOwner;
  title: string;
  time?: string;
  items: string[];
  notes?: string;
  createdBy: UserKey;
  createdAt?: string;
  updatedAt?: string;
};

export type Activity = {
  _id?: string;
  owner: PlanOwner;
  date: string;
  title: string;
  time?: string;
  comment?: string;
  completedBy: Partial<Record<UserKey, boolean>>;
  createdBy: UserKey;
  createdAt?: string;
  updatedAt?: string;
};

export type SavedActivity = {
  _id?: string;
  owner: PlanOwner;
  title: string;
  time?: string;
  comment?: string;
  createdBy: UserKey;
  createdAt?: string;
  updatedAt?: string;
};

export type SavedDayPlan = {
  _id?: string;
  owner: PlanOwner;
  title: string;
  kind: DayPlanKind;
  meals: Meal[];
  activities: SavedActivity[];
  createdBy: UserKey;
  createdAt?: string;
  updatedAt?: string;
};

export type WeekDayTemplate = {
  weekday: number;
  label: string;
  meals: Meal[];
  activities: SavedActivity[];
};

export type SavedWeekPlan = {
  _id?: string;
  owner: PlanOwner;
  title: string;
  description?: string;
  days: WeekDayTemplate[];
  createdBy: UserKey;
  createdAt?: string;
  updatedAt?: string;
};

export type HealthTip = {
  _id?: string;
  title: string;
  category: 'meal' | 'smoothie' | 'supplement' | 'routine' | 'training' | 'other';
  body: string;
  createdBy: UserKey;
  createdAt?: string;
  updatedAt?: string;
};


export type PublicSharedPlan = {
  _id?: string;
  type: SharedPlanType;
  visibility: SharedVisibility;
  title: string;
  description?: string;
  tags?: string[];
  language?: LanguageCode;
  sourceOwner: PlanOwner;
  publishedBy: UserKey;
  publishedByName?: string;
  meals?: Meal[];
  activities?: SavedActivity[];
  dayPlan?: SavedDayPlan;
  weekPlan?: SavedWeekPlan;
  monthPlan?: unknown;
  copies?: number;
  likes?: number;
  isFeatured?: boolean;
  createdAt?: string;
  updatedAt?: string;
};
