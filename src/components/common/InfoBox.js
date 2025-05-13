import React from 'react';
import { Info, AlertTriangle, CheckCircle, HelpCircle } from 'lucide-react';

/**
 * Composant InfoBox amélioré avec le design Tutoreel
 * Affiche une boîte d'information avec différents types
 * 
 * @param {Object} props - Les propriétés du composant
 * @param {React.ReactNode} props.children - Le contenu de la boîte d'information
 * @param {string} props.type - Le type de la boîte (info, warning, success, help)
 * @param {string} props.className - Classes CSS supplémentaires
 * @returns {JSX.Element} - Le composant InfoBox
 */
const InfoBox = ({ children, type = 'info', className = '' }) => {
  // Configuration des types
  const config = {
    info: { 
      bgColor: 'bg-blue-50', 
      borderColor: 'border-blue-500', 
      textColor: 'text-blue-700', 
      icon: Info 
    },
    warning: { 
      bgColor: 'bg-amber-50', 
      borderColor: 'border-amber-500', 
      textColor: 'text-amber-700', 
      icon: AlertTriangle 
    },
    success: { 
      bgColor: 'bg-emerald-50', 
      borderColor: 'border-emerald-500', 
      textColor: 'text-emerald-700', 
      icon: CheckCircle 
    },
    help: { 
      bgColor: 'bg-indigo-50', 
      borderColor: 'border-indigo-500', 
      textColor: 'text-indigo-700', 
      icon: HelpCircle 
    }
  };

  // Obtenir la configuration pour ce type
  const { bgColor, borderColor, textColor, icon: Icon } = config[type] || config.info;

  return (
    <div className={`${bgColor} border-l-4 ${borderColor} p-4 rounded-lg flex items-start mb-4 shadow-sm ${className}`}>
      <Icon className={`${textColor} mr-3 flex-shrink-0`} size={20} />
      <div className="text-sm">{children}</div>
    </div>
  );
};

export default InfoBox;
