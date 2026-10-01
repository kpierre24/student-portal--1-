import React, { useState } from 'react';
import { notificationService } from '../services/notificationService';
import { BroadcastMessage } from '../types';
import { generateUUID } from '../../../lib/idGenerator';

export const BroadcastForm: React.FC = () => {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newBroadcast: BroadcastMessage = {
      id: generateUUID(),
      title,
      content,
      targetAudience: 'all',
      createdAt: new Date().toISOString(),
      authorId: 'admin' // In real app, get from auth context
    };
    notificationService.addBroadcast(newBroadcast);
    setTitle('');
    setContent('');
  };

  return (
    <form onSubmit={handleSubmit} className="p-6 border rounded-lg bg-white shadow-sm">
      <h3 className="text-xl font-bold mb-4">Send Broadcast</h3>
      <input 
        type="text" 
        value={title} 
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Title"
        className="w-full p-2 mb-4 border rounded"
        required
      />
      <textarea 
        value={content} 
        onChange={(e) => setContent(e.target.value)}
        placeholder="Content"
        className="w-full p-2 mb-4 border rounded"
        required
      />
      <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">
        Send
      </button>
    </form>
  );
};
