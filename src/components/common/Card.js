import React from 'react';

/**
 * Composant Card amélioré avec le design Tutoreel
 * Affiche une carte avec différentes variantes et effets
 * 
 * @param {Object} props - Les propriétés du composant
 * @param {React.ReactNode} props.children - Le contenu de la carte
 * @param {string} props.variant - La variante de la carte (default, glass, gradient)
 * @param {boolean} props.hover - Si la carte doit avoir un effet de survol
 * @param {string} props.className - Classes CSS supplémentaires
 * @returns {JSX.Element} - Le composant Card
 */
const Card = ({ 
  children, 
  variant = 'default', 
  hover = true,
  className = '',
  ...rest 
}) => {
  // Configuration des variantes
  const variantClasses = {
    default: 'bg-white',
    glass: 'glass-effect',
    gradient: 'bg-gradient-to-br from-indigo-50 to-white'
  };

  // Classes de base
  const baseClasses = 'tutoreel-card rounded-xl overflow-hidden shadow-sm border border-gray-100 p-4';
  
  // Classes pour l'effet de survol
  const hoverClasses = hover ? 'hover:shadow-md hover:-translate-y-1' : '';

  return (
    <div 
      className={`${baseClasses} ${variantClasses[variant]} ${hoverClasses} ${className}`}
      {...rest}
    >
      {children}
    </div>
  );
};

export default Card;
