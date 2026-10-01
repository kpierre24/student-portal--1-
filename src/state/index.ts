/**
 * Three-Level State Architecture
 * 
 * 1. Server State (src/state/server/):
 *    - Students, grades, attendance, assignments, invoices
 *    - Kept close to the relevant feature and API layer.
 * 
 * 2. Application State (src/state/application/):
 *    - Current user, theme, navigation, global modal registry, notifications
 *    - Provided via ApplicationStateProvider / AppProviders.
 * 
 * 3. Local UI State (src/state/local/):
 *    - isModalOpen, searchTerm, selectedStudent, activeFilter, formStep
 *    - Kept inside individual components whenever possible.
 */

// Level 1: Server State
export * as serverState from './server';
export * from './server';

// Level 2: Application State
export * as appState from './application';
export * from './application';

// Level 3: Local UI State
export * as localUIState from './local';
export * from './local';
