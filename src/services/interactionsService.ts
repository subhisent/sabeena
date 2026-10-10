import {
  collection,
  addDoc,
  getDocs,
  query,
  where,
  orderBy,
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore';
import { db } from './firebase';
import { COLLECTIONS } from '../constants';
import { Interaction, InteractionOutcome } from '../types';

export interface AddInteractionInput {
  taskId: string;
  customerId: string;
  staffId: string;
  outcome: InteractionOutcome;
  remarks: string;
  nextFollowUp?: Timestamp | Date | null;
}

/**
 * Log a new interaction for a task/customer.
 */
export async function addInteraction(input: AddInteractionInput): Promise<string> {
  try {
    const interactionsRef = collection(db, COLLECTIONS.INTERACTIONS);
    const docRef = await addDoc(interactionsRef, {
      taskId: input.taskId,
      customerId: input.customerId,
      staffId: input.staffId,
      outcome: input.outcome,
      remarks: input.remarks.trim(),
      nextFollowUp: input.nextFollowUp
        ? input.nextFollowUp instanceof Date
          ? Timestamp.fromDate(input.nextFollowUp)
          : input.nextFollowUp
        : null,
      createdAt: serverTimestamp(),
    });
    return docRef.id;
  } catch (err: any) {
    console.error('Error in addInteraction:', err);
    throw new Error(`Failed to log interaction: ${err?.message || err}`);
  }
}

/**
 * List all interactions logged for a specific task.
 */
export async function listInteractionsForTask(taskId: string): Promise<Interaction[]> {
  try {
    const interactionsRef = collection(db, COLLECTIONS.INTERACTIONS);
    const q = query(
      interactionsRef,
      where('taskId', '==', taskId),
      orderBy('createdAt', 'desc')
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map((docSnap) => {
      const data = docSnap.data();
      return {
        id: docSnap.id,
        taskId: data.taskId || '',
        customerId: data.customerId || '',
        staffId: data.staffId || '',
        outcome: data.outcome || 'no_answer',
        remarks: data.remarks || '',
        nextFollowUp: data.nextFollowUp || null,
        createdAt: data.createdAt as Timestamp,
      };
    });
  } catch (err: any) {
    console.error(`Error in listInteractionsForTask (${taskId}):`, err);
    throw new Error(`Failed to list interactions for task: ${err?.message || err}`);
  }
}
