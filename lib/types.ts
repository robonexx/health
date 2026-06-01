export type UserKey = 'robert' | 'erika';
export type PlanOwner = UserKey | 'shared';
export type PlanLength = 'day' | 'week' | 'ongoing';
export type DayPlanKind = 'food' | 'training' | 'full';

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
  weekday: number; // 1 = Monday, 7 = Sunday
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
