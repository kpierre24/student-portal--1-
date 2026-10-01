import React from 'react';
import { Modal as BaseModal, ModalProps as BaseModalProps } from '../Modal';

export type ModalProps = BaseModalProps;
export const Modal = BaseModal;

export function ModalHeader({
  className = '',
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={`px-6 py-4 border-b border-[var(--color-border)] dark:border-slate-800 ${className}`} {...props}>
      {children}
    </div>
  );
}

export function ModalBody({
  className = '',
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={`p-6 overflow-y-auto max-h-[75vh] ${className}`} {...props}>
      {children}
    </div>
  );
}

export function ModalFooter({
  className = '',
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={`px-6 py-4 border-t border-[var(--color-border)] dark:border-slate-800 flex items-center justify-end gap-3 bg-[var(--color-surface)] dark:bg-slate-900/50 ${className}`} {...props}>
      {children}
    </div>
  );
}
