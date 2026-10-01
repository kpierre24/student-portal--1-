/**
 * ============================================================================
 * SYNCHRONIZED APPLICATION STATE INTERFACE
 * HTEIM School of Ministry
 * ============================================================================
 * Strongly typed interface for workspace snapshot state stored in Supabase
 * PostgreSQL (app_states table) and hydrated into local offline cache.
 */

export interface SyncedAppState {
  version?: number;
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
  [key: string]: any;
}
