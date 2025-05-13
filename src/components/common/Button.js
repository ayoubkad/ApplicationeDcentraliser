import React from 'react';
import { Loader } from 'lucide-react';

/**
 * Composant Button amélioré avec des variantes et états
 * Utilise le design Tutoreel pour une apparence cohérente
 * 
 * @param {Object} props - Les propriétés du composant
 * @param {React.ReactNode} props.children - Le contenu du bouton
 * @param {React.ReactNode} props.icon - L'icône à afficher (composant Lucide)
 * @param {string} props.variant - La variante du bouton (primary, secondary, accent, success, warning, danger, outline, ghost)
 * @param {string} props.size - La taille du bouton (sm, md, lg)
 * @param {boolean} props.isLoading - Si le bouton est en état de chargement
 * @param {boolean} props.isFullWidth - Si le bouton doit prendre toute la largeur disponible
 * @param {string} props.className - Classes CSS supplémentaires
 * @param {Function} props.onClick - Fonction à exécuter lors du clic sur le bouton
 * @param {boolean} props.disabled - Si le bouton est désactivé
 * @returns {JSX.Element} - Le composant Button
 */
const Button = ({ 
  children, 
  icon: Icon, 
  variant = 'primary', 
  size = 'md',
  isLoading = false,
  isFullWidth = false,
  className = '',
  onClick,
  disabled = false,
  ...rest
}) => {
  // Configuration des variantes avec les classes Tutoreel
  const variantClasses = {
    primary: 'tutoreel-btn-primary',
    secondary: 'tutoreel-btn-secondary',
    accent: 'tutoreel-btn-accent',
    success: 'tutoreel-btn-success',
    warning: 'tutoreel-btn-warning',
    danger: 'tutoreel-btn-danger',
    outline: 'tutoreel-btn-outline',
    ghost: 'tutoreel-btn-ghost'
  };

  // Configuration des tailles
  const sizeClasses = {
    sm: 'tutoreel-btn-sm',
    md: 'tutoreel-btn-md',
    lg: 'tutoreel-btn-lg'
  };

  // Classes de base
  const baseClasses = 'tutoreel-btn';
  
  // Classes pour le bouton désactivé
  const disabledClasses = disabled || isLoading ? 'tutoreel-btn-disabled' : '';
  
  // Classes pour la largeur
  const widthClasses = isFullWidth ? 'w-full' : '';

  // Classes pour les icônes
  const iconClasses = Icon ? 'tutoreel-btn-icon' : '';

  return (
    <button
      className={`${baseClasses} ${variantClasses[variant]} ${sizeClasses[size]} ${widthClasses} ${disabledClasses} ${iconClasses} ${className}`}
      onClick={onClick}
      disabled={disabled || isLoading}
      {...rest}
    >
      {isLoading ? (
        <>
          <Loader size={size === 'sm' ? 16 : size === 'lg' ? 24 : 20} className="mr-2 animate-spin" />
          <span>{children}</span>
        </>
      ) : (
        <>
          {Icon && <Icon size={size === 'sm' ? 16 : size === 'lg' ? 24 : 20} className="mr-2" />}
          <span>{children}</span>
        </>
      )}
    </button>
  );
};

export default Button;
