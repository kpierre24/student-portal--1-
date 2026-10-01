import { app } from './auth';
import { 
  initializeFirestore, 
  doc, 
  getDoc, 
  setDoc, 
  getDocFromServer,
  enableIndexedDbPersistence,
  deleteField
} from 'firebase/firestore';
import { getFirebaseConfig } from './firebaseConfig';
import { logger } from './logger';

const firebaseConfig = getFirebaseConfig();

// Initialize Firestore using the explicit database ID from config if present
export const db = firebaseConfig.firestoreDatabaseId 
  ? initializeFirestore(app, { ignoreUndefinedProperties: true }, firebaseConfig.firestoreDatabaseId)
  : initializeFirestore(app, { ignoreUndefinedProperties: true });

// Enable offline persistence if available in browser context
if (typeof window !== 'undefined') {
  enableIndexedDbPersistence(db).catch((err) => {
    if (err.code === 'failed-precondition') {
      logger.warn("Firestore offline persistence failed-precondition: multiple tabs open.");
    } else if (err.code === 'unimplemented') {
      logger.warn("Firestore offline persistence is unimplemented in this browser.");
    } else {
      logger.warn("Firestore offline persistence failed to initialize:", err);
    }
  });
}

// Test connection to verify configuration
export async function testConnection() {
  try {
    await getDocFromServer(doc(db, 'app_states', 'connection_test'));
    logger.info("Firebase Firestore connection verified.");
    return true;
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      logger.warn("Please check your Firebase configuration. Client is operating in offline mode.");
    } else {
      logger.warn("Firestore connection check info:", error);
    }
    return false;
  }
}


export interface SyncedAppState {
  records?: any[];
  classDays?: any[];
  studentNotes?: Record<string, string>;
  excusedAbsences?: Record<string, Record<string, boolean>>;
  rubricScores?: Record<string, any>;
  deletedStudentNames?: string[];
  studentPhotos?: Record<string, string>;
  studentLevels?: Record<string, string>;
  customAssignments?: any[];
  submissions?: any[];
  notifications?: any[];
  messages?: any[];
  sheetUrl?: string;
  courses?: any[];
  schedules?: any[];
  libraryResources?: any[];
  classroomMedia?: any[];
  facultyTeachers?: any[];
  payments?: any[];
  zoomExceptionNote?: string;
  hasZoomException?: boolean;
  userCredentials?: any[];
  activeZoomSession?: any;
  updatedAt?: string;
  updatedBy?: string;
  dataSource?: 'demo' | 'production' | 'sheets';
}

/**
 * Gets the document reference based on whether a user is logged in
 */
export function getStateDocRef(userEmail: string | null | undefined) {
  const docId = userEmail 
    ? `user_${userEmail.replace(/[^a-zA-Z0-9]/g, '_')}` 
    : 'shared_default_state';
  return doc(db, 'app_states', docId);
}

/**
 * Load application state from Firestore
 */
export async function loadFromFirestore(userEmail: string | null | undefined): Promise<SyncedAppState | null> {
  try {
    const baseId = userEmail 
      ? `user_${userEmail.replace(/[^a-zA-Z0-9]/g, '_')}` 
      : 'shared_default_state';
    
    const refMain = doc(db, 'app_states', baseId);
    const refPhotos = doc(db, 'app_states', `${baseId}_photos`);
    const refRecords = doc(db, 'app_states', `${baseId}_records`);
    const refSubmissions = doc(db, 'app_states', `${baseId}_submissions`);
    const refMedia = doc(db, 'app_states', `${baseId}_media`);
    const refPayments = doc(db, 'app_states', `${baseId}_payments`);

    // Fetch all documents in parallel
    const [
      snapMain,
      snapPhotos,
      snapRecords,
      snapSubmissions,
      snapMedia,
      snapPayments
    ] = await Promise.all([
      getDoc(refMain),
      getDoc(refPhotos),
      getDoc(refRecords),
      getDoc(refSubmissions),
      getDoc(refMedia),
      getDoc(refPayments)
    ]);

    if (!snapMain.exists()) {
      return null;
    }

    // Merge everything. Initialize with main data (handles backward compatibility)
    const mergedState: SyncedAppState = {
      ...snapMain.data()
    };

    // Override with sub-document data if present
    if (snapPhotos.exists()) {
      const d = snapPhotos.data();
      if (d.studentPhotos) mergedState.studentPhotos = d.studentPhotos;
    }
    if (snapRecords.exists()) {
      const d = snapRecords.data();
      if (d.records) mergedState.records = d.records;
    }
    if (snapSubmissions.exists()) {
      const d = snapSubmissions.data();
      if (d.submissions) mergedState.submissions = d.submissions;
    }
    if (snapMedia.exists()) {
      const d = snapMedia.data();
      if (d.classroomMedia) mergedState.classroomMedia = d.classroomMedia;
      if (d.libraryResources) mergedState.libraryResources = d.libraryResources;
    }
    if (snapPayments.exists()) {
      const d = snapPayments.data();
      if (d.payments) mergedState.payments = d.payments;
    }

    return mergedState;
  } catch (error) {
    if (error instanceof Error && (error.message.includes('offline') || error.message.includes('failed to get document'))) {
      logger.warn("Firestore is operating offline. Falling back to local state.", error.message);
    } else {
      logger.error("Error loading state from Firestore:", error);
    }
    return null;
  }
}

/**
 * Save application state to Firestore
 */
export async function saveToFirestore(
  userEmail: string | null | undefined, 
  state: SyncedAppState
): Promise<boolean> {
  try {
    const baseId = userEmail 
      ? `user_${userEmail.replace(/[^a-zA-Z0-9]/g, '_')}` 
      : 'shared_default_state';

    const timestamp = new Date().toISOString();
    const updater = userEmail || 'anonymous';

    // Separate the large fields from the main state
    const {
      studentPhotos,
      records,
      submissions,
      classroomMedia,
      libraryResources,
      payments,
      ...mainState
    } = state;

    // We explicitly set the large fields to deleteField() on the main document
    // to free up space and migrate the data seamlessly without hitches
    const mainData = {
      ...mainState,
      updatedAt: timestamp,
      updatedBy: updater,
      studentPhotos: deleteField(),
      records: deleteField(),
      submissions: deleteField(),
      classroomMedia: deleteField(),
      libraryResources: deleteField(),
      payments: deleteField()
    };

    const mainDocRef = doc(db, 'app_states', baseId);
    const writePromises: Promise<any>[] = [
      setDoc(mainDocRef, mainData, { merge: true })
    ];

    if (studentPhotos !== undefined) {
      const docRef = doc(db, 'app_states', `${baseId}_photos`);
      writePromises.push(setDoc(docRef, { studentPhotos, updatedAt: timestamp, updatedBy: updater }, { merge: true }));
    }
    if (records !== undefined) {
      const docRef = doc(db, 'app_states', `${baseId}_records`);
      writePromises.push(setDoc(docRef, { records, updatedAt: timestamp, updatedBy: updater }, { merge: true }));
    }
    if (submissions !== undefined) {
      const docRef = doc(db, 'app_states', `${baseId}_submissions`);
      writePromises.push(setDoc(docRef, { submissions, updatedAt: timestamp, updatedBy: updater }, { merge: true }));
    }
    if (classroomMedia !== undefined || libraryResources !== undefined) {
      const docRef = doc(db, 'app_states', `${baseId}_media`);
      const mediaData: any = { updatedAt: timestamp, updatedBy: updater };
      if (classroomMedia !== undefined) mediaData.classroomMedia = classroomMedia;
      if (libraryResources !== undefined) mediaData.libraryResources = libraryResources;
      writePromises.push(setDoc(docRef, mediaData, { merge: true }));
    }
    if (payments !== undefined) {
      const docRef = doc(db, 'app_states', `${baseId}_payments`);
      writePromises.push(setDoc(docRef, { payments, updatedAt: timestamp, updatedBy: updater }, { merge: true }));
    }

    await Promise.all(writePromises);
    return true;
  } catch (error) {
    if (error instanceof Error && error.message.includes('offline')) {
      logger.warn("Firestore is offline. Save is queued and will synchronize once online:", error.message);
      return true; // Return true because Firestore automatically queues and syncs offline writes
    }
    logger.error("Error saving state to Firestore:", error);
    return false;
  }
}
