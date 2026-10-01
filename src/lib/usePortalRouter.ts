import { useState, useEffect, useCallback } from 'react';
import { TabType } from '../types';

export interface RouteState {
  tab: TabType;
  student?: string;
  action?: string;
  view?: string;
  id?: string;
}

/**
 * Custom hook providing lightweight URL parameter routing and browser history navigation.
 * Enables deep-linking, back-button support (popstate), and panel views without modal clutter.
 */
export function usePortalRouter(defaultTab: TabType = 'home') {
  const getRouteFromUrl = useCallback((): RouteState => {
    if (typeof window === 'undefined') {
      return { tab: defaultTab };
    }
    const params = new URLSearchParams(window.location.search);
    const tabParam = (params.get('tab') as TabType) || defaultTab;
    const student = params.get('student') || undefined;
    const action = params.get('action') || undefined;
    const view = params.get('view') || undefined;
    const id = params.get('id') || undefined;

    return {
      tab: tabParam,
      student,
      action,
      view,
      id,
    };
  }, [defaultTab]);

  const [route, setRoute] = useState<RouteState>(getRouteFromUrl);

  // Sync state with popstate (browser back/forward button clicks)
  useEffect(() => {
    const handlePopState = () => {
      setRoute(getRouteFromUrl());
    };

    window.addEventListener('popstate', handlePopState);
    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, [getRouteFromUrl]);

  /**
   * Navigate to a new route state and update URL search params with browser history entry.
   */
  const navigate = useCallback((nextRoute: Partial<RouteState>, replace: boolean = false) => {
    if (typeof window === 'undefined') return;

    const currentParams = new URLSearchParams(window.location.search);
    const updatedTab = nextRoute.tab || (currentParams.get('tab') as TabType) || defaultTab;

    const newParams = new URLSearchParams();
    newParams.set('tab', updatedTab);

    // If changing tabs completely without specifying new sub-params, clear student/action/view/id
    const isTabChange = nextRoute.tab && nextRoute.tab !== currentParams.get('tab');

    if (nextRoute.student !== undefined) {
      if (nextRoute.student) newParams.set('student', nextRoute.student);
    } else if (!isTabChange && currentParams.get('student')) {
      newParams.set('student', currentParams.get('student')!);
    }

    if (nextRoute.action !== undefined) {
      if (nextRoute.action) newParams.set('action', nextRoute.action);
    } else if (!isTabChange && currentParams.get('action')) {
      newParams.set('action', currentParams.get('action')!);
    }

    if (nextRoute.view !== undefined) {
      if (nextRoute.view) newParams.set('view', nextRoute.view);
    } else if (!isTabChange && currentParams.get('view')) {
      newParams.set('view', currentParams.get('view')!);
    }

    if (nextRoute.id !== undefined) {
      if (nextRoute.id) newParams.set('id', nextRoute.id);
    } else if (!isTabChange && currentParams.get('id')) {
      newParams.set('id', currentParams.get('id')!);
    }

    const newUrl = `${window.location.pathname}?${newParams.toString()}${window.location.hash}`;

    const newState: RouteState = {
      tab: updatedTab,
      student: newParams.get('student') || undefined,
      action: newParams.get('action') || undefined,
      view: newParams.get('view') || undefined,
      id: newParams.get('id') || undefined,
    };

    if (replace) {
      window.history.replaceState(newState, '', newUrl);
    } else {
      window.history.pushState(newState, '', newUrl);
    }

    setRoute(newState);
  }, [defaultTab]);

  /**
   * Go back in browser history or reset sub-parameters
   */
  const goBack = useCallback(() => {
    if (typeof window !== 'undefined' && window.history.length > 1) {
      window.history.back();
    } else {
      // Fallback: clear sub-parameters and stay on tab
      navigate({ action: undefined, view: undefined, student: undefined, id: undefined });
    }
  }, [navigate]);

  return {
    route,
    navigate,
    goBack,
  };
}
