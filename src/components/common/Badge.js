import React from 'react';

/**
 * Composant Badge amélioré avec le design Tutoreel
 * Affiche un badge avec différentes variantes
 * 
 * @param {Object} props - Les propriétés du composant
 * @param {React.ReactNode} props.children - Le contenu du badge
 * @param {string} props.variant - La variante du badge (primary, secondary, success, warning, danger, info)
 * @param {React.ReactNode} props.icon - L'icône à afficher (composant Lucide)
 * @param {string} props.className - Classes CSS supplémentaires
 * @returns {JSX.Element} - Le composant Badge
 */
const Badge = ({ 
  children, 
  variant = 'primary', 
  icon: Icon,
  className = '',
  ...rest 
}) => {
  // Configuration des variantes
  const variantClasses = {
    primary: 'bg-indigo-100 text-indigo-800',
    secondary: 'bg-blue-100 text-blue-800',
    success: 'bg-emerald-100 text-emerald-800',
    warning: 'bg-amber-100 text-amber-800',
    danger: 'bg-red-100 text-red-800',
    info: 'bg-sky-100 text-sky-800'
  };

  // Classes de base
  const baseClasses = 'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium';

  return (
    <span 
      className={`${baseClasses} ${variantClasses[variant]} ${className}`}
      {...rest}
    >
      {Icon && <Icon size={12} className="mr-1" />}
      {children}
    </span>
  );
};

export default Badge;
