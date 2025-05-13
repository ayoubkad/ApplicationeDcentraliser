import React, { useState } from 'react';
import { ChevronDown } from 'lucide-react';

/**
 * Composant Section amélioré avec le design Tutoreel
 * Affiche une section avec un titre et un contenu, peut être expansible
 * 
 * @param {Object} props - Les propriétés du composant
 * @param {string} props.title - Le titre de la section
 * @param {React.ReactNode} props.icon - L'icône à afficher (composant Lucide)
 * @param {React.ReactNode} props.children - Le contenu de la section
 * @param {boolean} props.collapsible - Si la section peut être réduite/agrandie
 * @param {boolean} props.defaultExpanded - Si la section est agrandie par défaut (pour collapsible=true)
 * @param {string} props.className - Classes CSS supplémentaires
 * @returns {JSX.Element} - Le composant Section
 */
const Section = ({ 
  title, 
  icon: Icon, 
  children, 
  collapsible = false, 
  defaultExpanded = false,
  className = '',
  ...rest 
}) => {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  // Si la section n'est pas réductible, toujours afficher le contenu
  const shouldShowContent = !collapsible || isExpanded;

  return (
    <div className={`mb-4 border border-gray-200 rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-all duration-300 ${className}`} {...rest}>
      <div
        className={`w-full p-5 flex justify-between items-center transition-colors duration-300 ${
          isExpanded ? 'bg-indigo-50' : 'bg-white hover:bg-gray-50'
        }`}
        {...(collapsible ? { onClick: () => setIsExpanded(!isExpanded), role: 'button' } : {})}
      >
        <div className="flex items-center space-x-4">
          {Icon && (
            <div className={`p-2 rounded-lg transition-colors duration-300 ${
              isExpanded ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-600'
            }`}>
              <Icon size={20} />
            </div>
          )}
          <h3 className="text-lg font-semibold text-gray-800">{title}</h3>
        </div>
        
        {collapsible && (
          <ChevronDown
            className={`transform transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''} text-gray-500`}
            size={20}
          />
        )}
      </div>

      {shouldShowContent && (
        <div className="p-5 bg-white border-t border-gray-100 animate-fadeIn">
          {children}
        </div>
      )}
    </div>
  );
};

export default Section;
