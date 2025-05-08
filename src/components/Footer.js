import React, { useCallback, memo } from 'react';
import { 
  Home, 
  BookOpen, 
  User, 
  Settings, 
  GraduationCap, 
  FileText, 
  Shield, 
  HelpCircle,
  Facebook,
  Twitter,
  Github
} from 'lucide-react';

const SocialButton = ({ icon, label }) => (
  <button 
    className="text-gray-500 hover:text-[#2A3B8C] transition-all duration-300 transform hover:scale-110" 
    aria-label={label}
  >
    {icon}
  </button>
);

const Footer = memo(({ setActiveTab, isAdmin }) => {
  const handleNavClick = useCallback((tab) => () => setActiveTab(tab), [setActiveTab]);
  
  // Filtrer les liens en fonction du statut admin
  const getNavLinks = () => {
    const baseLinks = [
      { id: 'home', label: 'Accueil', icon: <Home className="w-4 h-4 mr-2" /> },
      { id: 'catalog', label: 'Catalogue', icon: <BookOpen className="w-4 h-4 mr-2" /> },
      { id: 'dashboard', label: 'Mon Espace', icon: <User className="w-4 h-4 mr-2" /> },
      { id: 'admin', label: 'Administration', icon: <Settings className="w-4 h-4 mr-2" /> }
    ];

    // Ajouter le lien du tutoriel seulement pour les non-admins
    if (!isAdmin) {
      baseLinks.push({ id: 'tutorial', label: 'Tutoriel Blockchain', icon: <GraduationCap className="w-4 h-4 mr-2" /> });
    }

    return baseLinks;
  };

  const navLinks = getNavLinks();

  const socialIcons = [
    { 
      label: 'Facebook', 
      icon: <Facebook className="w-6 h-6" />
    },
    { 
      label: 'Twitter', 
      icon: <Twitter className="w-6 h-6" />
    },
    { 
      label: 'GitHub', 
      icon: <Github className="w-6 h-6" />
    }
  ];

  const footerLinks = [
    { label: 'Conditions d\'utilisation', icon: <FileText className="w-3 h-3 mr-1" /> },
    { label: 'Politique de confidentialité', icon: <Shield className="w-3 h-3 mr-1" /> }
  ];

  return (
    <footer className="bg-[#F8F9FA] border-t mt-16">
      <div className="container mx-auto px-6 py-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
          <div>
            <h3 className="text-2xl font-bold text-[#2A3B8C] mb-6">BiblioChain</h3>
            <p className="text-gray-600 text-sm leading-relaxed">
              Gérez vos emprunts universitaires de manière transparente et sécurisée grâce à la blockchain Ethereum.
            </p>
            <div className="mt-6 flex items-center text-sm text-gray-600">
              <div className="h-3 w-3 rounded-full bg-[#4CAF50] mr-3"></div>
              <span>Réseau: Ethereum (Sepolia)</span>
            </div>
          </div>

          <div>
            <h3 className="text-xl font-semibold text-[#2A3B8C] mb-6">Liens Rapides</h3>
            <ul className="space-y-4">
              {navLinks.map(link => (
                <li key={link.id}>
                  <button 
                    onClick={handleNavClick(link.id)} 
                    className="flex items-center text-[#2A3B8C] hover:text-[#1F2D6B] hover:underline transition-colors duration-200"
                  >
                    {link.icon}
                    {link.label}
                  </button>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="text-xl font-semibold text-[#2A3B8C] mb-6">Contact & Infos</h3>
            <p className="text-gray-600 text-sm mb-6">
              Contrat: <a href="https://sepolia.etherscan.io" target="_blank" rel="noopener noreferrer" className="font-mono text-xs bg-[#2A3B8C]/10 px-2 py-1 rounded text-[#2A3B8C] hover:bg-[#2A3B8C]/20 transition">0x1234...5678</a>
            </p>
            <div className="flex space-x-6">
              {socialIcons.map((social, index) => (
                <SocialButton key={index} icon={social.icon} label={social.label} />
              ))}
            </div>
          </div>
        </div>

        <div className="border-t border-gray-200 mt-12 pt-8">
          <div className="flex flex-wrap justify-between items-center">
            <p className="text-gray-600 text-sm mb-4 md:mb-0">
              &copy; {new Date().getFullYear()} BiblioChain. Tous droits réservés.
            </p>
            <div className="flex items-center space-x-6">
              {footerLinks.map((link, index) => (
                <a 
                  key={index}
                  href="#" 
                  className="flex items-center text-sm text-gray-600 hover:text-[#2A3B8C] hover:underline transition-colors duration-200"
                >
                  {link.icon}
                  {link.label}
                </a>
              ))}
              {!isAdmin && (
                <button
                  onClick={handleNavClick('tutorial')}
                  className="flex items-center text-sm text-gray-600 hover:text-[#2A3B8C] hover:underline transition-colors duration-200"
                >
                  <HelpCircle className="w-3 h-3 mr-1" />
                  Tutoriel Blockchain
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
});

export default Footer;