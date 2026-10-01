import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { AppUser, UserRole } from '../../lib/userAuth';
import { Permission, roleHasPermission } from '../../types/rbac';

export interface AuthContextType {
  currentUser: AppUser | null;
  setCurrentUser: React.Dispatch<React.SetStateAction<AppUser | null>>;
  isAuthenticated: boolean;
  role: UserRole | null;
  hasPermission: (permission: Permission) => boolean;
  login: (user: AppUser) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}

export function useCurrentUser(): AppUser | null {
  const { currentUser } = useAuth();
  return currentUser;
}

export interface AuthProviderProps {
  children: React.ReactNode;
  initialUser?: AppUser | null;
}

export function AuthProvider({ children, initialUser = null }: AuthProviderProps) {
  const [currentUser, setCurrentUser] = useState<AppUser | null>(() => {
    if (initialUser !== undefined && initialUser !== null) return initialUser;
    try {
      const saved = localStorage.getItem('hteim_current_user');
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return null;
  });

  useEffect(() => {
    try {
      if (currentUser) {
        localStorage.setItem('hteim_current_user', JSON.stringify(currentUser));
      } else {
        localStorage.removeItem('hteim_current_user');
      }
    } catch (e) {}
  }, [currentUser]);

  const login = useCallback((user: AppUser) => {
    setCurrentUser(user);
  }, []);

  const logout = useCallback(() => {
    setCurrentUser(null);
  }, []);

  const hasPermission = useCallback((permission: Permission): boolean => {
    if (!currentUser) return false;
    if (currentUser.permissions?.includes(permission)) return true;
    return roleHasPermission(currentUser.role, permission);
  }, [currentUser]);

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        setCurrentUser,
        isAuthenticated: !!currentUser,
        role: currentUser?.role || null,
        hasPermission,
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
