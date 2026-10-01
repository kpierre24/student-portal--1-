import React, { createContext, useContext, useState, useCallback } from 'react';

export type GlobalModalType = 
  | 'login'
  | 'settings'
  | 'report'
  | 'cohort'
  | 'guide'
  | 'mobileDownload'
  | 'classDays'
  | 'presentation'
  | 'cloudSyncConflict'
  | 'offlineDrawer'
  | 'export'
  | 'roleManagement'
  | 'studentTranscript'
  | 'certificate'
  | 'batchEmail'
  | 'studentDetail';

export interface GlobalModalContextType {
  activeModal: GlobalModalType | string | null;
  modalPayload: any;
  openModal: (modal: GlobalModalType | string, payload?: any) => void;
  closeModal: (modal?: GlobalModalType | string) => void;
  isModalOpen: (modal: GlobalModalType | string) => boolean;
  toggleModal: (modal: GlobalModalType | string, payload?: any) => void;
}

const GlobalModalContext = createContext<GlobalModalContextType | undefined>(undefined);

export function useGlobalModal(): GlobalModalContextType {
  const context = useContext(GlobalModalContext);
  if (!context) {
    throw new Error('useGlobalModal must be used within GlobalModalProvider');
  }
  return context;
}

export function GlobalModalProvider({ children }: { children: React.ReactNode }) {
  const [activeModal, setActiveModal] = useState<string | null>(null);
  const [modalPayload, setModalPayload] = useState<any>(null);

  const openModal = useCallback((modal: GlobalModalType | string, payload: any = null) => {
    setActiveModal(modal);
    setModalPayload(payload);
  }, []);

  const closeModal = useCallback((modal?: GlobalModalType | string) => {
    setActiveModal(current => {
      if (!modal || current === modal) {
        setModalPayload(null);
        return null;
      }
      return current;
    });
  }, []);

  const isModalOpen = useCallback((modal: GlobalModalType | string): boolean => {
    return activeModal === modal;
  }, [activeModal]);

  const toggleModal = useCallback((modal: GlobalModalType | string, payload: any = null) => {
    setActiveModal(current => {
      if (current === modal) {
        setModalPayload(null);
        return null;
      }
      setModalPayload(payload);
      return modal;
    });
  }, []);

  return (
    <GlobalModalContext.Provider
      value={{
        activeModal,
        modalPayload,
        openModal,
        closeModal,
        isModalOpen,
        toggleModal,
      }}
    >
      {children}
    </GlobalModalContext.Provider>
  );
}
