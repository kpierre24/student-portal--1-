import React from 'react';
import { NotificationList } from './NotificationList';
import { useNotifications } from '../hooks/useNotifications';

export const NotificationCenter: React.FC = () => {
  const { unreadCount } = useNotifications();

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">Notifications</h2>
        {unreadCount > 0 && (
          <span className="px-2 py-1 bg-red-500 text-white text-xs font-bold rounded-full">
            {unreadCount} New
          </span>
        )}
      </div>
      <NotificationList />
    </div>
  );
};
