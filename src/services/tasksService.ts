import {
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  updateDoc,
  query,
  where,
  orderBy,
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore';
import { db } from './firebase';
import { COLLECTIONS } from '../constants';
import { Task, TaskStatus, TaskPriority } from '../types';

export interface CreateTaskInput {
  customerId: string;
  customerName: string;
  customerPhone: string;
  assignedTo: string;
  assignedBy: string;
  priority?: TaskPriority;
  dueDate?: Timestamp | Date | null;
  status?: TaskStatus;
}

/**
 * Create a new task assigned to staff.
 */
export async function createTask(input: CreateTaskInput): Promise<string> {
  try {
    const tasksRef = collection(db, COLLECTIONS.TASKS);
    const docRef = await addDoc(tasksRef, {
      customerId: input.customerId,
      customerName: input.customerName,
      customerPhone: input.customerPhone,
      assignedTo: input.assignedTo,
      assignedBy: input.assignedBy,
      status: input.status || 'pending',
      outcome: null,
      lastRemarks: null,
      nextFollowUp: null,
      priority: input.priority || 'medium',
      dueDate: input.dueDate ? (input.dueDate instanceof Date ? Timestamp.fromDate(input.dueDate) : input.dueDate) : null,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    return docRef.id;
  } catch (err: any) {
    console.error('Error in createTask:', err);
    throw new Error(`Failed to create task: ${err?.message || err}`);
  }
}

/**
 * List tasks assigned to a specific staff member.
 */
export async function listTasksForStaff(staffUid: string): Promise<Task[]> {
  try {
    const tasksRef = collection(db, COLLECTIONS.TASKS);
    const q = query(
      tasksRef,
      where('assignedTo', '==', staffUid),
      orderBy('createdAt', 'desc')
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map((docSnap) => {
      const data = docSnap.data();
      return {
        id: docSnap.id,
        customerId: data.customerId || '',
        customerName: data.customerName || '',
        customerPhone: data.customerPhone || '',
        assignedTo: data.assignedTo || '',
        assignedBy: data.assignedBy || '',
        status: data.status || 'pending',
        outcome: data.outcome || null,
        lastRemarks: data.lastRemarks || null,
        nextFollowUp: data.nextFollowUp || null,
        priority: data.priority || 'medium',
        dueDate: data.dueDate || null,
        createdAt: data.createdAt as Timestamp,
        updatedAt: data.updatedAt as Timestamp,
      };
    });
  } catch (err: any) {
    console.error(`Error in listTasksForStaff (${staffUid}):`, err);
    throw new Error(`Failed to list tasks for staff: ${err?.message || err}`);
  }
}

/**
 * List all tasks in the system (for admin dashboard).
 */
export async function listAllTasks(): Promise<Task[]> {
  try {
    const tasksRef = collection(db, COLLECTIONS.TASKS);
    const q = query(tasksRef, orderBy('createdAt', 'desc'));
    const snapshot = await getDocs(q);
    return snapshot.docs.map((docSnap) => {
      const data = docSnap.data();
      return {
        id: docSnap.id,
        customerId: data.customerId || '',
        customerName: data.customerName || '',
        customerPhone: data.customerPhone || '',
        assignedTo: data.assignedTo || '',
        assignedBy: data.assignedBy || '',
        status: data.status || 'pending',
        outcome: data.outcome || null,
        lastRemarks: data.lastRemarks || null,
        nextFollowUp: data.nextFollowUp || null,
        priority: data.priority || 'medium',
        dueDate: data.dueDate || null,
        createdAt: data.createdAt as Timestamp,
        updatedAt: data.updatedAt as Timestamp,
      };
    });
  } catch (err: any) {
    console.error('Error in listAllTasks:', err);
    throw new Error(`Failed to list all tasks: ${err?.message || err}`);
  }
}

/**
 * Update a task's status and remarks/outcome.
 */
export async function updateTaskStatus(
  taskId: string,
  status: TaskStatus,
  outcome?: string | null,
  lastRemarks?: string | null,
  nextFollowUp?: Timestamp | Date | null
): Promise<void> {
  try {
    const taskDocRef = doc(db, COLLECTIONS.TASKS, taskId);
    const updatePayload: Record<string, any> = {
      status,
      updatedAt: serverTimestamp(),
    };
    if (outcome !== undefined) updatePayload.outcome = outcome;
    if (lastRemarks !== undefined) updatePayload.lastRemarks = lastRemarks;
    if (nextFollowUp !== undefined) {
      updatePayload.nextFollowUp = nextFollowUp instanceof Date ? Timestamp.fromDate(nextFollowUp) : nextFollowUp;
    }
    await updateDoc(taskDocRef, updatePayload);
  } catch (err: any) {
    console.error(`Error updating task status ${taskId}:`, err);
    throw new Error(`Failed to update task status: ${err?.message || err}`);
  }
}
