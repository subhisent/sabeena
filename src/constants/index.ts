export const COLLECTIONS = {
  USERS: 'users',
  CUSTOMERS: 'customers',
  TASKS: 'tasks',
  INTERACTIONS: 'interactions',
} as const;

export const USER_ROLES = {
  ADMIN: 'admin',
  STAFF: 'staff',
} as const;

export const CUSTOMER_STATUSES = {
  NEW: 'new',
  ASSIGNED: 'assigned',
  CONTACTED: 'contacted',
  INTERESTED: 'interested',
  CONVERTED: 'converted',
  NOT_INTERESTED: 'not_interested',
} as const;

export const CUSTOMER_STATUS_LABELS: Record<string, string> = {
  new: 'New Lead',
  assigned: 'Assigned',
  contacted: 'Contacted',
  interested: 'Interested',
  converted: 'Converted',
  not_interested: 'Not Interested',
};

export const TASK_STATUSES = {
  PENDING: 'pending',
  IN_PROGRESS: 'in_progress',
  COMPLETED: 'completed',
} as const;

export const TASK_STATUS_LABELS: Record<string, string> = {
  pending: 'Pending',
  in_progress: 'In Progress',
  completed: 'Completed',
};

export const TASK_PRIORITIES = {
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high',
} as const;

export const TASK_PRIORITY_LABELS: Record<string, string> = {
  low: 'Low',
  medium: 'Medium',
  high: 'High',
};

export const INTERACTION_OUTCOMES = {
  NO_ANSWER: 'no_answer',
  CALL_BACK_LATER: 'call_back_later',
  INTERESTED: 'interested',
  NOT_INTERESTED: 'not_interested',
  CONVERTED: 'converted',
} as const;

export const INTERACTION_OUTCOME_LABELS: Record<string, string> = {
  no_answer: 'No Answer',
  call_back_later: 'Call Back Later',
  interested: 'Interested',
  not_interested: 'Not Interested',
  converted: 'Converted (Won)',
};
