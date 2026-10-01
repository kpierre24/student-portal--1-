import React from 'react';
import { useA11yAnnouncer } from '../../lib/a11yAnnouncer';

export const A11yLiveRegion: React.FC = () => {
  const { politeMessage, assertiveMessage } = useA11yAnnouncer();

  return (
    <>
      {/* Polite Live Region */}
      <div
        role="status"
        aria-live="polite"
        aria-atomic="true"
        className="sr-only pointer-events-none fixed -top-96 left-0 w-1 h-1 overflow-hidden"
      >
        {politeMessage}
      </div>

      {/* Assertive Live Region */}
      <div
        role="alert"
        aria-live="assertive"
        aria-atomic="true"
        className="sr-only pointer-events-none fixed -top-96 left-0 w-1 h-1 overflow-hidden"
      >
        {assertiveMessage}
      </div>
    </>
  );
};
