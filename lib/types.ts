export type UserKey = 'robert' | 'erika';
export type PlanOwner = UserKey | 'shared';
export type PlanLength = 'day' | 'week' | 'ongoing';

export type Meal = {
  id: string;
  title: string;
  items: string[];
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

export type HealthTip = {
  _id?: string;
  title: string;
  category: 'meal' | 'smoothie' | 'supplement' | 'routine' | 'training' | 'other';
  body: string;
  createdBy: UserKey;
  createdAt?: string;
  updatedAt?: string;
};
