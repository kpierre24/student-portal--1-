import React, { useState, useEffect } from 'react';

type AnnouncerListener = (state: { politeMessage: string; assertiveMessage: string }) => void;

let politeMsg = '';
let assertiveMsg = '';
const listeners = new Set<AnnouncerListener>();

function notifyListeners() {
  const currentState = { politeMessage: politeMsg, assertiveMessage: assertiveMsg };
  listeners.forEach((listener) => listener(currentState));
}

export function announceToScreenReader(message: string, politeness: 'polite' | 'assertive' = 'polite') {
  if (politeness === 'assertive') {
    assertiveMsg = message;
    notifyListeners();
    setTimeout(() => {
      if (assertiveMsg === message) {
        assertiveMsg = '';
        notifyListeners();
      }
    }, 3000);
  } else {
    politeMsg = message;
    notifyListeners();
    setTimeout(() => {
      if (politeMsg === message) {
        politeMsg = '';
        notifyListeners();
      }
    }, 3000);
  }
}

export function useA11yAnnouncer() {
  const [messages, setMessages] = useState({ politeMessage: politeMsg, assertiveMessage: assertiveMsg });

  useEffect(() => {
    listeners.add(setMessages);
    return () => {
      listeners.delete(setMessages);
    };
  }, []);

  return messages;
}
