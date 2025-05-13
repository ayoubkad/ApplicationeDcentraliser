import React, { useState } from 'react';
import {
  Wallet, BookOpen, ChevronDown, Download, UserPlus,
  RefreshCw, CheckCircle, AlertCircle, HelpCircle,
  BookmarkIcon, RotateCw, Info
} from 'lucide-react';

// Composant InfoBox amélioré avec des couleurs Tailwind plus cohérentes
const InfoBox = ({ children, type = 'info' }) => {
  const config = {
    info: { bgColor: 'bg-blue-50', borderColor: 'border-blue-500', textColor: 'text-blue-700', icon: Info },
    warning: { bgColor: 'bg-amber-50', borderColor: 'border-amber-500', textColor: 'text-amber-700', icon: AlertCircle },
    success: { bgColor: 'bg-emerald-50', borderColor: 'border-emerald-500', textColor: 'text-emerald-700', icon: CheckCircle },
    help: { bgColor: 'bg-indigo-50', borderColor: 'border-indigo-500', textColor: 'text-indigo-700', icon: HelpCircle }
  }[type];

  const Icon = config.icon;

  return (
    <div className={`${config.bgColor} border-l-4 ${config.borderColor} p-4 rounded-lg flex items-start mb-4 shadow-sm`}>
      <Icon className={`${config.textColor} mr-3 flex-shrink-0`} size={20} />
      <div className="text-sm">{children}</div>
    </div>
  );
};

// Composant de section optimisé
const TutorialSection = ({
  id,
  title,
  icon: Icon,
  children,
  expandedSection,
  setExpandedSection
}) => {
  const isExpanded = expandedSection === id;

  return (
    <div className="mb-4 tutoreel-card overflow-hidden">
      <button
        onClick={() => setExpandedSection(isExpanded ? null : id)}
        className={`w-full p-5 flex justify-between items-center transition-colors duration-300 ${
          isExpanded ? 'bg-indigo-50' : 'bg-white hover:bg-gray-50'
        }`}
      >
        <div className="flex items-center space-x-4">
          <div className={`p-2 rounded-lg transition-colors duration-300 ${
            isExpanded ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-600'
          }`}>
            <Icon size={20} />
          </div>
          <h3 className="text-lg font-semibold text-gray-800">{title}</h3>
        </div>
        <ChevronDown
          className={`transform transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''} text-gray-500`}
          size={20}
        />
      </button>

      {isExpanded && (
        <div className="p-5 bg-white border-t border-gray-100 animate-fadeIn">
          {children}
        </div>
      )}
    </div>
  );
};

const TutorialTab = ({ setActiveTab, isConnected, connectToMetaMask }) => {
  const [expandedSection, setExpandedSection] = useState('welcome');
  const [quickStart, setQuickStart] = useState(false);

  const sections = [
    { id: 'welcome', title: 'Bienvenue', icon: Info },
    { id: 'metamask', title: 'Configuration MetaMask', icon: Wallet },
    { id: 'connection', title: 'Connexion', icon: RefreshCw },
    { id: 'registration', title: 'Inscription', icon: UserPlus },
    { id: 'borrowing', title: 'Emprunter et Retourner', icon: BookOpen }
  ];

  const progress = ((sections.findIndex(s => s.id === expandedSection) + 1) / sections.length) * 100;

  return (
    <div className="max-w-4xl mx-auto px-4 py-6">
      {/* En-tête avec tutoreel-gradient-header */}
      <div className="tutoreel-gradient-header p-8 mb-8 rounded-2xl">
        <div className="max-w-2xl mx-auto">
          <h1 className="text-4xl font-bold mb-4">Guide BiblioChain</h1>
          <p className="text-lg opacity-90 mb-6">
            Maîtrisez notre plateforme de bibliothèque décentralisée en quelques étapes
          </p>
          <div className="flex flex-wrap gap-3">
            <button
              onClick={() => setActiveTab('catalog')}
              className="tutoreel-btn tutoreel-btn-ghost tutoreel-btn-lg"
            >
              <BookmarkIcon size={18} className="mr-2" />
              Explorer le catalogue
            </button>
          </div>
        </div>
      </div>

      {/* Barre de progression améliorée */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm font-medium text-gray-600">Progression</span>
          <span className="text-sm font-medium text-indigo-600">{Math.round(progress)}%</span>
        </div>
        <div className="h-3 bg-gray-100 rounded-full overflow-hidden shadow-inner">
          <div
            className="h-full bg-gradient-to-r from-indigo-600 to-blue-400 transition-all duration-700 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Toggle pour le mode Quick Start */}
      <div className="mb-6 flex justify-end">
        <button
          onClick={() => setQuickStart(!quickStart)}
          className={`tutoreel-btn tutoreel-btn-sm flex items-center ${
            quickStart
              ? 'tutoreel-btn-primary'
              : 'tutoreel-btn-outline'
          }`}
        >
          <RotateCw size={16} className="mr-2" />
          {quickStart ? 'Mode détaillé' : 'Mode rapide'}
        </button>
      </div>

      {/* Sections de contenu */}
      <div className="space-y-5">
        {sections.map((section) => (
          <TutorialSection
            key={section.id}
            id={section.id}
            title={section.title}
            icon={section.icon}
            expandedSection={expandedSection}
            setExpandedSection={setExpandedSection}
          >
            {section.id === 'welcome' && (
              <div className="space-y-5">
                <InfoBox>
                  <p className="font-medium">Vous pouvez explorer librement le catalogue sans connexion.</p>
                  <p className="mt-2 text-gray-600">
                    La connexion avec MetaMask est uniquement nécessaire pour les actions impliquant
                    des transactions blockchain comme l'emprunt ou le retour de livres.
                  </p>
                </InfoBox>

                {quickStart ? (
                  <div className="p-4 tutoreel-glass rounded-lg">
                    <h4 className="font-medium text-indigo-800 mb-2">Guide rapide</h4>
                    <ol className="space-y-2 ml-5 list-decimal text-indigo-700">
                      <li>Installez MetaMask et créez un portefeuille</li>
                      <li>Connectez-vous avec le bouton en haut à droite</li>
                      <li>Inscrivez-vous via le bouton "S'inscrire"</li>
                      <li>Explorez le catalogue et empruntez des livres</li>
                    </ol>
                  </div>
                ) : (
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="p-4 tutoreel-glass rounded-xl">
                      <h4 className="font-semibold text-gray-800 mb-3">Sans connexion</h4>
                      <ul className="space-y-2 text-gray-600">
                        <li className="flex items-center">
                          <CheckCircle size={16} className="text-emerald-500 mr-2" />
                          Explorer le catalogue
                        </li>
                        <li className="flex items-center">
                          <CheckCircle size={16} className="text-emerald-500 mr-2" />
                          Consulter les détails
                        </li>
                      </ul>
                    </div>

                    <div className="p-4 tutoreel-glass rounded-xl bg-indigo-50/50">
                      <h4 className="font-semibold text-indigo-800 mb-3">Avec connexion</h4>
                      <ul className="space-y-2 text-indigo-700">
                        <li className="flex items-center">
                          <AlertCircle size={16} className="text-indigo-500 mr-2" />
                          Emprunter des livres
                        </li>
                        <li className="flex items-center">
                          <AlertCircle size={16} className="text-indigo-500 mr-2" />
                          Gérer son espace
                        </li>
                      </ul>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Ajoutez ici le contenu des autres sections */}
            {section.id === 'metamask' && (
              <div className="space-y-4">
                <InfoBox type="info">
                  <p className="font-medium">MetaMask est votre passeport vers la blockchain.</p>
                  <p className="mt-2">Cette extension de navigateur vous permet d'interagir avec notre plateforme de manière sécurisée.</p>
                </InfoBox>

                <div className="bg-gray-50 p-4 rounded-lg">
                  <h4 className="font-medium mb-3">Étapes d'installation :</h4>
                  <ol className="space-y-3 ml-5 list-decimal">
                    <li className="text-gray-700">Installer l'extension MetaMask depuis le store de votre navigateur</li>
                    <li className="text-gray-700">Créer un nouveau portefeuille ou importer un existant</li>
                    <li className="text-gray-700">Connecter MetaMask au réseau Ethereum</li>
                  </ol>
                </div>
              </div>
            )}

            {section.id === 'connection' && (
              <div className="space-y-4">
                <InfoBox type="warning">
                  <p className="font-medium">Assurez-vous que MetaMask est installé avant de continuer.</p>
                </InfoBox>

                <button
                  onClick={connectToMetaMask}
                  className="w-full tutoreel-btn tutoreel-btn-secondary tutoreel-btn-lg flex items-center justify-center"
                >
                  <Wallet size={20} className="mr-2" />
                  <span>Connecter avec MetaMask</span>
                </button>

                {isConnected && (
                  <div className="mt-4 p-4 bg-green-50 border border-green-100 rounded-lg">
                    <div className="flex items-center text-green-700 mb-2">
                      <CheckCircle size={18} className="mr-2" />
                      <span className="font-medium">Vous êtes connecté !</span>
                    </div>
                    <p className="text-sm text-green-600">Votre portefeuille est maintenant lié à BiblioChain. Vous pouvez passer à l'étape suivante.</p>
                  </div>
                )}
              </div>
            )}

            {section.id === 'registration' && (
              <div className="space-y-4">
                <InfoBox type="info">
                  <p className="font-medium">L'inscription vous permet d'accéder à toutes les fonctionnalités de BiblioChain.</p>
                  <p className="mt-2">Cette étape nécessite une transaction sur la blockchain pour créer votre profil utilisateur.</p>
                </InfoBox>

                {!isConnected ? (
                  <div className="p-4 bg-amber-50 border border-amber-100 rounded-lg">
                    <div className="flex items-center text-amber-700 mb-2">
                      <AlertCircle size={18} className="mr-2" />
                      <span className="font-medium">Connexion requise</span>
                    </div>
                    <p className="text-sm text-amber-600 mb-3">Vous devez d'abord vous connecter avec MetaMask avant de pouvoir vous inscrire.</p>
                    <button
                      onClick={() => setExpandedSection('connection')}
                      className="text-sm bg-amber-100 hover:bg-amber-200 text-amber-700 px-4 py-2 rounded-lg transition-colors"
                    >
                      Retour à l'étape de connexion
                    </button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <h4 className="font-medium mb-3">Processus d'inscription :</h4>
                      <ol className="space-y-3 ml-5 list-decimal">
                        <li className="text-gray-700">Cliquez sur le bouton "S'inscrire" dans la barre de navigation</li>
                        <li className="text-gray-700">Remplissez le formulaire avec vos informations</li>
                        <li className="text-gray-700">Confirmez la transaction dans MetaMask</li>
                        <li className="text-gray-700">Attendez la confirmation de la blockchain</li>
                      </ol>
                    </div>

                    <div className="p-4 bg-blue-50 border border-blue-100 rounded-lg">
                      <h4 className="font-medium text-blue-700 mb-2">Bon à savoir</h4>
                      <ul className="space-y-2 text-sm text-blue-600">
                        <li className="flex items-start">
                          <Info size={16} className="text-blue-500 mr-2 mt-0.5 flex-shrink-0" />
                          L'inscription ne nécessite qu'une seule transaction blockchain.
                        </li>
                        <li className="flex items-start">
                          <Info size={16} className="text-blue-500 mr-2 mt-0.5 flex-shrink-0" />
                          Votre réputation commence à 0 et augmente à mesure que vous utilisez le service.
                        </li>
                      </ul>
                    </div>

                    <button
                      onClick={() => setActiveTab('login')}
                      className="w-full tutoreel-btn tutoreel-btn-primary tutoreel-btn-lg flex items-center justify-center"
                    >
                      <UserPlus size={20} className="mr-2" />
                      <span>Aller à la page d'inscription</span>
                    </button>
                  </div>
                )}
              </div>
            )}

            {section.id === 'borrowing' && (
              <div className="space-y-4">
                <InfoBox type="success">
                  <p className="font-medium">Félicitations ! Vous êtes prêt à emprunter des livres sur BiblioChain.</p>
                  <p className="mt-2">Découvrez comment emprunter et retourner des livres en quelques étapes simples.</p>
                </InfoBox>

                <div className="grid md:grid-cols-2 gap-4 mb-4">
                  <div className="p-4 bg-indigo-50 rounded-xl border border-indigo-100 shadow-sm">
                    <h4 className="font-semibold text-indigo-800 mb-3 flex items-center">
                      <Download size={18} className="mr-2 text-indigo-600" />
                      Emprunter un livre
                    </h4>
                    <ol className="space-y-2 ml-5 list-decimal text-indigo-700">
                      <li>Parcourez le catalogue et sélectionnez un livre</li>
                      <li>Cliquez sur "Emprunter"</li>
                      <li>Confirmez la transaction dans MetaMask</li>
                      <li>Le livre apparaîtra dans votre espace personnel</li>
                    </ol>
                  </div>

                  <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-100 shadow-sm">
                    <h4 className="font-semibold text-emerald-800 mb-3 flex items-center">
                      <RefreshCw size={18} className="mr-2 text-emerald-600" />
                      Retourner un livre
                    </h4>
                    <ol className="space-y-2 ml-5 list-decimal text-emerald-700">
                      <li>Accédez à votre espace personnel</li>
                      <li>Trouvez le livre à retourner</li>
                      <li>Cliquez sur "Retourner"</li>
                      <li>Confirmez la transaction dans MetaMask</li>
                    </ol>
                  </div>
                </div>

                <div className="bg-gray-50 p-4 rounded-lg">
                  <h4 className="font-medium mb-3">Points importants :</h4>
                  <ul className="space-y-2 text-gray-600">
                    <li className="flex items-start">
                      <AlertCircle size={16} className="text-amber-500 mr-2 mt-0.5 flex-shrink-0" />
                      Chaque emprunt et retour nécessite une transaction blockchain
                    </li>
                    <li className="flex items-start">
                      <AlertCircle size={16} className="text-amber-500 mr-2 mt-0.5 flex-shrink-0" />
                      Respectez la durée d'emprunt pour maintenir une bonne réputation
                    </li>
                    <li className="flex items-start">
                      <CheckCircle size={16} className="text-emerald-500 mr-2 mt-0.5 flex-shrink-0" />
                      Une bonne réputation vous donne accès à plus de livres simultanément
                    </li>
                  </ul>
                </div>

                <button
                  onClick={() => setActiveTab('catalog')}
                  className="w-full tutoreel-btn tutoreel-btn-secondary tutoreel-btn-lg flex items-center justify-center"
                >
                  <BookmarkIcon size={20} className="mr-2" />
                  <span>Explorer le catalogue</span>
                </button>
              </div>
            )}
          </TutorialSection>
        ))}
      </div>

      {/* CTA final amélioré */}
      <div className="mt-12 text-center tutoreel-glass p-8 rounded-2xl">
        <p className="text-gray-600 mb-5">Prêt à commencer votre voyage ?</p>
        <div className="flex justify-center gap-3">
          <button
            onClick={() => setActiveTab('catalog')}
            className="tutoreel-btn tutoreel-btn-primary tutoreel-btn-lg"
          >
            <BookOpen size={20} className="mr-2" />
            Découvrir les livres
          </button>
        </div>
      </div>
    </div>
  );
};

export default TutorialTab;
