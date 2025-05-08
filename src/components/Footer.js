import React, { useCallback, memo } from 'react';

const SocialButton = ({ icon, label }) => (
  <button className="text-gray-500 hover:text-[#2A3B8C] transition" aria-label={label}>
    {icon}
  </button>
);

const Footer = memo(({ setActiveTab }) => {
  const handleNavClick = useCallback((tab) => () => setActiveTab(tab), [setActiveTab]);
  
  const navLinks = [
    { id: 'home', label: 'Accueil' },
    { id: 'catalog', label: 'Catalogue' },
    { id: 'dashboard', label: 'Mon Espace' },
    { id: 'admin', label: 'Administration' }
  ];

  const socialIcons = [
    { 
      label: 'Facebook', 
      icon: <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5"><path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"></path></svg>
    },
    { 
      label: 'Twitter', 
      icon: <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5"><path d="M22 4s-.7 2.1-2 3.4c1.6 10-9.4 17.3-18 11.6 2.2.1 4.4-.6 6-2C3 15.5.5 9.6 3 5c2.2 2.6 5.6 4.1 9 4-.9-4.2 4-6.6 7-3.8 1.1 0 3-1.2 3-1.2z"></path></svg>
    },
    { 
      label: 'GitHub', 
      icon: <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5"><path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22"></path></svg>
    }
  ];

  return (
    <footer className="bg-[#F8F9FA] border-t mt-12">
      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div>
            <h3 className="text-lg font-semibold text-[#2A3B8C] mb-4">BiblioChain</h3>
            <p className="text-gray-600 text-sm">
              Une bibliothèque universitaire décentralisée, fonctionnant sur la blockchain Ethereum pour une gestion transparente et sécurisée des emprunts.
            </p>
            <div className="mt-4 flex items-center text-sm text-gray-500">
              <div className="h-2 w-2 rounded-full bg-[#4CAF50] mr-2"></div>
              <span>Réseau: Ethereum (Sepolia)</span>
            </div>
          </div>

          <div>
            <h3 className="text-lg font-semibold text-[#2A3B8C] mb-4">Liens Rapides</h3>
            <ul className="space-y-2">
              {navLinks.map(link => (
                <li key={link.id}>
                  <button 
                    onClick={handleNavClick(link.id)} 
                    className="text-[#2A3B8C] hover:text-[#1F2D6B] hover:underline"
                  >
                    {link.label}
                  </button>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="text-lg font-semibold text-[#2A3B8C] mb-4">Contact & Infos</h3>
            <p className="text-gray-600 text-sm mb-4">
              Contrat: <a href="https://sepolia.etherscan.io" target="_blank" rel="noopener noreferrer" className="font-mono text-xs bg-[#2A3B8C]/10 px-2 py-1 rounded text-[#2A3B8C] hover:bg-[#2A3B8C]/20 transition">0x1234...5678</a>
            </p>
            <div className="flex space-x-4">
              {socialIcons.map((social, index) => (
                <SocialButton key={index} icon={social.icon} label={social.label} />
              ))}
            </div>
          </div>
        </div>

        <div className="border-t border-gray-200 mt-8 pt-6">
          <div className="flex flex-wrap justify-between items-center">
            <p className="text-gray-500 text-sm mb-4 md:mb-0">
              &copy; {new Date().getFullYear()} BiblioChain. Tous droits réservés.
            </p>
            <div className="flex items-center space-x-4">
              <a href="#" className="text-xs text-gray-500 hover:text-[#2A3B8C] hover:underline">Conditions d'utilisation</a>
              <a href="#" className="text-xs text-gray-500 hover:text-[#2A3B8C] hover:underline">Politique de confidentialité</a>
              <a href="#" className="text-xs text-gray-500 hover:text-[#2A3B8C] hover:underline">Aide</a>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
});

export default Footer;