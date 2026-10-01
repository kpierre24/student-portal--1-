import React, { createContext, useContext, useState, useCallback } from 'react';
import { TabType } from '../../types';

export interface NavigationContextType {
  activeTab: TabType;
  setActiveTab: (tab: TabType) => void;
  navigate: (tab: TabType, subTab?: string | null) => void;
  activeSubTab: string | null;
  setActiveSubTab: (subTab: string | null) => void;
  unreadMessagesCount: number;
  setUnreadMessagesCount: React.Dispatch<React.SetStateAction<number>>;
  activeQuizzesCount: number;
  setActiveQuizzesCount: React.Dispatch<React.SetStateAction<number>>;
  navigationHistory: TabType[];
  canGoBack: boolean;
  goBack: () => void;
}

const NavigationContext = createContext<NavigationContextType | undefined>(undefined);

export function useNavigation(): NavigationContextType {
  const context = useContext(NavigationContext);
  if (!context) {
    throw new Error('useNavigation must be used within NavigationProvider');
  }
  return context;
}

export interface NavigationProviderProps {
  children: React.ReactNode;
  initialTab?: TabType;
}

export function NavigationProvider({ children, initialTab = 'home' }: NavigationProviderProps) {
  const [activeTab, setActiveTabState] = useState<TabType>(initialTab);
  const [activeSubTab, setActiveSubTab] = useState<string | null>(null);
  const [navigationHistory, setNavigationHistory] = useState<TabType[]>([initialTab]);
  const [unreadMessagesCount, setUnreadMessagesCount] = useState<number>(0);
  const [activeQuizzesCount, setActiveQuizzesCount] = useState<number>(0);

  const navigate = useCallback((tab: TabType, subTab: string | null = null) => {
    setActiveTabState(tab);
    setActiveSubTab(subTab);
    setNavigationHistory(prev => [...prev.slice(-19), tab]);
  }, []);

  const setActiveTab = useCallback((tab: TabType) => {
    navigate(tab, null);
  }, [navigate]);

  const goBack = useCallback(() => {
    setNavigationHistory(prev => {
      if (prev.length <= 1) return prev;
      const nextHistory = [...prev];
      nextHistory.pop();
      const previousTab = nextHistory[nextHistory.length - 1];
      setActiveTabState(previousTab);
      return nextHistory;
    });
  }, []);

  return (
    <NavigationContext.Provider
      value={{
        activeTab,
        setActiveTab,
        navigate,
        activeSubTab,
        setActiveSubTab,
        unreadMessagesCount,
        setUnreadMessagesCount,
        activeQuizzesCount,
        setActiveQuizzesCount,
        navigationHistory,
        canGoBack: navigationHistory.length > 1,
        goBack,
      }}
    >
      {children}
    </NavigationContext.Provider>
  );
}
