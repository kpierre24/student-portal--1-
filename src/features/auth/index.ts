import * as authServiceFunctions from '../../services/authService';

// Auth Feature Public API
export { LoginModal } from '../../components/LoginModal';
export * from '../../services/authService';
export * from '../../lib/userAuth';
export { AuthProvider, useAuth, useCurrentUser } from '../../state/application/AuthContext';

export const authService = {
  ...authServiceFunctions,
};
