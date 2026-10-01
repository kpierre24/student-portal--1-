import React from 'react';
import { Notification } from '../types';
import { useNotifications } from '../hooks/useNotifications';
import { Check } from 'lucide-react';

export const NotificationList: React.FC = () => {
  const { notifications, markRead } = useNotifications();

  return (
    <div className="space-y-4">
      {notifications.length === 0 ? (
        <p className="text-gray-500">No notifications.</p>
      ) : (
        notifications.map(n => (
          <div key={n.id} className={`p-4 border rounded-lg ${n.isRead ? 'bg-gray-50' : 'bg-white'}`}>
            <h4 className="font-semibold">{n.title}</h4>
            <p className="text-sm text-gray-600">{n.message}</p>
            {!n.isRead && (
              <button 
                onClick={() => markRead(n.id)}
                className="mt-2 flex items-center text-sm text-blue-600 hover:text-blue-800"
              >
                <Check className="w-4 h-4 mr-1" /> Mark as read
              </button>
            )}
          </div>
        ))
      )}
    </div>
  );
};
