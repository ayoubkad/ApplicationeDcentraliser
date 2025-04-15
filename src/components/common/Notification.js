import React from 'react';
import { CheckCircle, AlertTriangle, BookOpen, X } from 'lucide-react';

const Notification = ({ notification, setNotification }) => {
  if (!notification) return null;

  const bgColors = {
    success: 'bg-[#4CAF50]/90',
    error: 'bg-[#E53935]/90',
    warning: 'bg-[#FFD700]/90',
    info: 'bg-[#2A3B8C]/90'
  };

  const icons = {
    success: <CheckCircle size={20} className="mr-2" />,
    error: <AlertTriangle size={20} className="mr-2" />,
    warning: <AlertTriangle size={20} className="mr-2" />,
    info: <BookOpen size={20} className="mr-2" />
  };

  return (
    <div className="fixed bottom-4 right-4 z-50 max-w-md">
      <div className={`${bgColors[notification.type]} text-white px-4 py-3 rounded-lg shadow-lg flex items-center`}>
        {icons[notification.type]}
        <span>{notification.message}</span>
        <button
          onClick={() => setNotification(null)}
          className="ml-4 text-white hover:text-gray-200"
          aria-label="Fermer la notification"
        >
          <X size={18} />
        </button>
      </div>
    </div>
  );
};

export default Notification; 