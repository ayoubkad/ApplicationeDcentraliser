import React from 'react';
import { CheckCircle, AlertTriangle, BookOpen, X, Info } from 'lucide-react';

/**
 * Composant Notification amélioré avec le design Tutoreel
 * Affiche des notifications temporaires avec différents types et animations
 *
 * @param {Object} props - Les propriétés du composant
 * @param {Object|string} props.notification - L'objet de notification ou le message
 * @param {Function} props.setNotification - Fonction pour mettre à jour l'état de notification
 * @returns {JSX.Element|null} - Le composant Notification ou null si pas de notification
 */
const Notification = ({ notification, setNotification }) => {
  if (!notification) return null;

  // Définir les classes et icônes pour chaque type de notification
  const config = {
    success: {
      className: 'tutoreel-notification-success',
      icon: <CheckCircle size={20} className="mr-2" />
    },
    error: {
      className: 'tutoreel-notification-error',
      icon: <AlertTriangle size={20} className="mr-2" />
    },
    warning: {
      className: 'tutoreel-notification-warning',
      icon: <AlertTriangle size={20} className="mr-2" />
    },
    info: {
      className: 'tutoreel-notification-info',
      icon: <Info size={20} className="mr-2" />
    }
  };

  // Extraire les propriétés de la notification
  const type = typeof notification === 'object' && notification !== null
    ? (notification.type || 'info')
    : 'info';

  // Gérer différents types de messages: chaînes, objets, etc.
  let message = '';
  if (typeof notification === 'string') {
    message = notification;
  } else if (typeof notification === 'object' && notification !== null) {
    message = notification.message || '';
    // Si le message est encore un objet, le convertir en chaîne
    if (typeof message === 'object') {
      try {
        message = JSON.stringify(message);
      } catch (e) {
        message = 'Notification';
      }
    }
  }

  // Obtenir la configuration pour ce type de notification
  const { className } = config[type] || config.info;

  return (
    <div className="tutoreel-notification animate-slideInUp">
      <div className={`tutoreel-notification-content ${className} flex items-center`}>
        {config[type].icon}
        <span>{message}</span>
        <button
          onClick={() => setNotification(null)}
          className="tutoreel-notification-close hover:bg-white/10 ml-4"
          aria-label="Fermer la notification"
        >
          <X size={18} />
        </button>
      </div>
    </div>
  );
};

export default Notification;