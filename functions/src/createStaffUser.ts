import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();

interface CreateStaffRequest {
  email: string;
  password?: string;
  name: string;
  phone: string;
  role: 'admin' | 'staff';
  staffId?: string;
}

/**
 * Callable Cloud Function: createStaffUser
 * Allows an active Admin to create a new user account in Firebase Auth
 * and populate their document in the 'users' collection without logging out.
 */
export const createStaffUser = functions.https.onCall(async (data: CreateStaffRequest, context) => {
  // 1. Verify caller authentication
  if (!context.auth) {
    throw new functions.https.HttpsError(
      'unauthenticated',
      'The function must be called by an authenticated user.'
    );
  }

  const callerUid = context.auth.uid;
  const callerDoc = await db.collection('users').doc(callerUid).get();

  if (!callerDoc.exists || callerDoc.data()?.role !== 'admin') {
    throw new functions.https.HttpsError(
      'permission-denied',
      'Only administrators can create staff accounts.'
    );
  }

  const { email, password = 'Password@123', name, phone, role = 'staff', staffId } = data;

  if (!email || !name) {
    throw new functions.https.HttpsError(
      'invalid-argument',
      'Email and Name are required.'
    );
  }

  try {
    // 2. Create user in Firebase Authentication
    const userRecord = await admin.auth().createUser({
      email: email.trim().toLowerCase(),
      password: password,
      displayName: name.trim(),
      phoneNumber: phone ? (phone.startsWith('+') ? phone : `+91${phone.replace(/[^0-9]/g, '')}`) : undefined,
    });

    // 3. Create document in Firestore users collection
    const userDocData = {
      uid: userRecord.uid,
      name: name.trim(),
      email: email.trim().toLowerCase(),
      phone: phone.trim(),
      role: role,
      active: true,
      staffId: staffId || `STF${Math.floor(100 + Math.random() * 900)}`,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    await db.collection('users').doc(userRecord.uid).set(userDocData);

    return {
      success: true,
      uid: userRecord.uid,
      message: `Staff user ${name} created successfully.`,
    };
  } catch (error: any) {
    console.error('Error creating staff user:', error);
    throw new functions.https.HttpsError('internal', error.message || 'Failed to create user');
  }
});
