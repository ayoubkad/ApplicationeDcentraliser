import React, { useState } from 'react';
import {
  Wallet,
  BookOpen,
  ChevronRight,
  ChevronDown,
  Download,
  UserPlus,
  RefreshCw,
  ArrowRight,
  CheckCircle,
  AlertCircle,
  HelpCircle,
  BookmarkIcon,
  RotateCw,
  Info
} from 'lucide-react';

const TutorialTab = ({ setActiveTab, isConnected, connectToMetaMask }) => {
  const [expandedSection, setExpandedSection] = useState('welcome');

  const toggleSection = (section) => {
    setExpandedSection(expandedSection === section ? null : section);
  };

  const TutorialSection = ({ id, title, icon, children }) => {
    const isExpanded = expandedSection === id;

    return (
      <div className="mb-6 border border-gray-200 rounded-lg overflow-hidden shadow-sm">
        <button
          className={`w-full flex items-center justify-between p-4 text-left ${
            isExpanded ? 'bg-blue-50' : 'bg-white'
          }`}
          onClick={() => toggleSection(id)}
        >
          <div className="flex items-center">
            <div className={`p-2 rounded-full ${isExpanded ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-700'}`}>
              {icon}
            </div>
            <h3 className="ml-3 text-lg font-semibold">{title}</h3>
          </div>
          {isExpanded ? <ChevronDown size={20} /> : <ChevronRight size={20} />}
        </button>

        {isExpanded && (
          <div className="p-4 bg-white border-t border-gray-200">
            {children}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="bg-gradient-to-r from-blue-700 to-indigo-800 text-white rounded-lg p-8 mb-8">
        <h1 className="text-3xl font-bold mb-4">Tutoriel BiblioChain</h1>
        <p className="text-xl mb-6">
          Apprenez à utiliser notre bibliothèque décentralisée basée sur la blockchain
        </p>
        <div className="flex flex-wrap gap-4">
          <button
            onClick={() => setActiveTab('catalog')}
            className="bg-blue-600 text-white px-4 py-2 rounded-md font-medium flex items-center hover:bg-blue-700 transition"
          >
            <BookmarkIcon size={18} className="mr-2" />
            Explorer le catalogue
          </button>
          {!isConnected && (
            <button
              onClick={connectToMetaMask}
              className="bg-white text-blue-700 px-4 py-2 rounded-md font-medium flex items-center hover:bg-blue-50 transition"
            >
              <Wallet size={18} className="mr-2" />
              Connecter MetaMask (optionnel)
            </button>
          )}
        </div>
      </div>

      <div className="mb-8">
        <h2 className="text-2xl font-bold mb-4 text-gray-800">Guide d'utilisation de BiblioChain</h2>
        <p className="text-gray-600 mb-4">
          BiblioChain est une bibliothèque décentralisée qui utilise la technologie blockchain pour gérer les emprunts et retours de livres de manière transparente et sécurisée. Ce tutoriel vous guidera à travers les étapes nécessaires pour commencer à utiliser notre plateforme.
        </p>
      </div>

      <TutorialSection
        id="welcome"
        title="Bienvenue dans le tutoriel BiblioChain"
        icon={<Info size={20} />}
      >
        <div className="space-y-4">
          <p>
            Vous pouvez explorer ce tutoriel sans avoir besoin de vous connecter avec MetaMask ou de créer un compte.
          </p>

          <div className="bg-blue-50 border-l-4 border-blue-400 p-4 rounded">
            <div className="flex">
              <Info size={24} className="text-blue-500 mr-2 flex-shrink-0" />
              <p>
                <strong>Bon à savoir :</strong> Pour emprunter ou retourner des livres, vous aurez besoin de vous connecter avec MetaMask et de vous inscrire sur la plateforme. Cependant, vous pouvez explorer le catalogue de livres sans connexion.
              </p>
            </div>
          </div>

          <h4 className="font-semibold text-lg mt-6">Ce que vous pouvez faire sans connexion :</h4>
          <ul className="list-disc pl-5 space-y-2">
            <li>Explorer le catalogue de livres</li>
            <li>Consulter les détails des livres disponibles</li>
            <li>Apprendre comment fonctionne la plateforme via ce tutoriel</li>
          </ul>

          <h4 className="font-semibold text-lg mt-6">Ce qui nécessite une connexion :</h4>
          <ul className="list-disc pl-5 space-y-2">
            <li>Emprunter des livres</li>
            <li>Retourner des livres empruntés</li>
            <li>Accéder à votre espace personnel</li>
            <li>Voir votre historique d'emprunts</li>
          </ul>
        </div>
      </TutorialSection>

      <TutorialSection
        id="metamask"
        title="1. Installation et configuration de MetaMask"
        icon={<Wallet size={20} />}
      >
        <div className="space-y-4">
          <h4 className="font-semibold text-lg">Qu'est-ce que MetaMask ?</h4>
          <p>
            MetaMask est un portefeuille de cryptomonnaies qui se présente sous forme d'extension de navigateur. Il vous permet d'interagir avec la blockchain Ethereum et les applications décentralisées (dApps) comme BiblioChain.
          </p>

          <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded">
            <div className="flex">
              <AlertCircle size={24} className="text-yellow-500 mr-2 flex-shrink-0" />
              <p>
                <strong>Important :</strong> MetaMask est nécessaire pour utiliser BiblioChain. Sans lui, vous ne pourrez pas emprunter ou retourner des livres.
              </p>
            </div>
          </div>

          <h4 className="font-semibold text-lg mt-6">Comment installer MetaMask</h4>
          <ol className="list-decimal pl-5 space-y-3">
            <li>
              <strong>Téléchargez l'extension :</strong> Visitez le <a href="https://metamask.io/download/" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">site officiel de MetaMask</a> et téléchargez l'extension pour votre navigateur (Chrome, Firefox, Brave, Edge).
            </li>
            <li>
              <strong>Installez l'extension :</strong> Suivez les instructions d'installation spécifiques à votre navigateur.
            </li>
            <li>
              <strong>Créez un portefeuille :</strong> Après l'installation, cliquez sur "Créer un portefeuille" et suivez les étapes pour créer votre portefeuille.
            </li>
            <li>
              <strong>Sécurisez votre phrase de récupération :</strong> MetaMask vous fournira une phrase de récupération de 12 mots. Notez-la et conservez-la en lieu sûr. Cette phrase est la seule façon de récupérer votre portefeuille en cas de perte d'accès.
            </li>
          </ol>

          <div className="bg-blue-50 border-l-4 border-blue-400 p-4 rounded mt-4">
            <div className="flex">
              <HelpCircle size={24} className="text-blue-500 mr-2 flex-shrink-0" />
              <p>
                <strong>Conseil :</strong> N'oubliez jamais votre mot de passe et ne partagez jamais votre phrase de récupération avec qui que ce soit.
              </p>
            </div>
          </div>
        </div>
      </TutorialSection>

      <TutorialSection
        id="connection"
        title="2. Connexion à BiblioChain avec MetaMask"
        icon={<RefreshCw size={20} />}
      >
        <div className="space-y-4">
          <p>
            Une fois MetaMask installé, vous pouvez vous connecter à BiblioChain en suivant ces étapes :
          </p>

          <ol className="list-decimal pl-5 space-y-3">
            <li>
              <strong>Ouvrez MetaMask :</strong> Cliquez sur l'icône de MetaMask dans votre navigateur pour vous assurer que vous êtes connecté à votre portefeuille.
            </li>
            <li>
              <strong>Connectez-vous à BiblioChain :</strong> Sur notre site, cliquez sur le bouton "Se connecter avec MetaMask" dans le menu de navigation.
            </li>
            <li>
              <strong>Autorisez la connexion :</strong> MetaMask vous demandera d'autoriser la connexion à BiblioChain. Cliquez sur "Connecter" pour approuver.
            </li>
            <li>
              <strong>Vérifiez la connexion :</strong> Une fois connecté, votre adresse de portefeuille apparaîtra dans le coin supérieur droit de l'écran.
            </li>
          </ol>

          <div className="bg-green-50 border-l-4 border-green-400 p-4 rounded mt-4">
            <div className="flex">
              <CheckCircle size={24} className="text-green-500 mr-2 flex-shrink-0" />
              <p>
                <strong>Succès :</strong> Lorsque vous êtes correctement connecté, vous verrez votre adresse de portefeuille abrégée (ex: 0x1234...5678) dans la barre de navigation.
              </p>
            </div>
          </div>

          <div className="mt-6 text-center">
            <button
              onClick={!isConnected ? connectToMetaMask : null}
              className={`px-4 py-2 rounded-md font-medium flex items-center mx-auto ${
                isConnected
                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                  : 'bg-blue-600 text-white hover:bg-blue-700'
              }`}
              disabled={isConnected}
            >
              <Wallet size={18} className="mr-2" />
              {isConnected ? 'Déjà connecté' : 'Connecter MetaMask (optionnel pour explorer le tutoriel)'}
            </button>
          </div>
        </div>
      </TutorialSection>

      <TutorialSection
        id="registration"
        title="3. Inscription sur BiblioChain"
        icon={<UserPlus size={20} />}
      >
        <div className="space-y-4">
          <p>
            Après avoir connecté votre portefeuille MetaMask, vous devez vous inscrire sur BiblioChain pour pouvoir emprunter des livres :
          </p>

          <ol className="list-decimal pl-5 space-y-3">
            <li>
              <strong>Accédez à la page d'inscription :</strong> Après vous être connecté avec MetaMask, vous serez automatiquement redirigé vers la page d'inscription si vous n'êtes pas encore inscrit.
            </li>
            <li>
              <strong>Remplissez le formulaire :</strong> Entrez vos informations personnelles (nom, prénom, statut - étudiant ou professeur).
            </li>
            <li>
              <strong>Confirmez la transaction :</strong> Cliquez sur "S'inscrire" et confirmez la transaction dans MetaMask. Cette transaction enregistre vos informations sur la blockchain.
            </li>
            <li>
              <strong>Attendez la confirmation :</strong> L'inscription peut prendre quelques instants pendant que la transaction est validée sur la blockchain.
            </li>
          </ol>

          <div className="bg-blue-50 border-l-4 border-blue-400 p-4 rounded mt-4">
            <div className="flex">
              <HelpCircle size={24} className="text-blue-500 mr-2 flex-shrink-0" />
              <p>
                <strong>Note :</strong> L'inscription ne nécessite qu'une seule transaction sur la blockchain. Une fois inscrit, vous n'aurez plus besoin de répéter ce processus.
              </p>
            </div>
          </div>

          <div className="mt-6 text-center">
            <button
              onClick={() => setActiveTab('login')}
              className="bg-blue-600 text-white px-4 py-2 rounded-md font-medium flex items-center mx-auto hover:bg-blue-700 transition"
            >
              <UserPlus size={18} className="mr-2" />
              Aller à la page d'inscription
            </button>
          </div>
        </div>
      </TutorialSection>

      <TutorialSection
        id="borrowing"
        title="4. Emprunter et retourner des livres"
        icon={<BookOpen size={20} />}
      >
        <div className="space-y-4">
          <h4 className="font-semibold text-lg">Emprunter un livre</h4>
          <p>
            Une fois inscrit, vous pouvez emprunter des livres de notre bibliothèque :
          </p>

          <ol className="list-decimal pl-5 space-y-3">
            <li>
              <strong>Parcourez le catalogue :</strong> Accédez au catalogue de livres en cliquant sur "Catalogue" dans le menu de navigation.
            </li>
            <li>
              <strong>Sélectionnez un livre :</strong> Trouvez un livre qui vous intéresse et cliquez sur "Emprunter".
            </li>
            <li>
              <strong>Confirmez la transaction :</strong> MetaMask vous demandera de confirmer la transaction. Cette transaction enregistre votre emprunt sur la blockchain.
            </li>
            <li>
              <strong>Accédez au livre :</strong> Une fois la transaction confirmée, vous pourrez accéder au contenu du livre depuis votre espace personnel.
            </li>
          </ol>

          <h4 className="font-semibold text-lg mt-6">Retourner un livre</h4>
          <p>
            Pour retourner un livre emprunté :
          </p>

          <ol className="list-decimal pl-5 space-y-3">
            <li>
              <strong>Accédez à votre espace :</strong> Cliquez sur "Mon Espace" dans le menu de navigation.
            </li>
            <li>
              <strong>Trouvez le livre :</strong> Localisez le livre que vous souhaitez retourner dans la liste de vos emprunts actifs.
            </li>
            <li>
              <strong>Retournez le livre :</strong> Cliquez sur le bouton "Retourner" à côté du livre.
            </li>
            <li>
              <strong>Confirmez la transaction :</strong> Approuvez la transaction dans MetaMask pour finaliser le retour.
            </li>
          </ol>

          <div className="bg-green-50 border-l-4 border-green-400 p-4 rounded mt-4">
            <div className="flex">
              <CheckCircle size={24} className="text-green-500 mr-2 flex-shrink-0" />
              <p>
                <strong>Système de réputation :</strong> Retourner les livres à temps améliore votre score de réputation, ce qui peut vous donner accès à des fonctionnalités supplémentaires à l'avenir.
              </p>
            </div>
          </div>

          <div className="mt-6 text-center">
            <button
              onClick={() => setActiveTab('catalog')}
              className="bg-blue-600 text-white px-4 py-2 rounded-md font-medium flex items-center mx-auto hover:bg-blue-700 transition"
            >
              <BookmarkIcon size={18} className="mr-2" />
              Explorer le catalogue
            </button>
          </div>
        </div>
      </TutorialSection>

      <TutorialSection
        id="troubleshooting"
        title="5. Résolution des problèmes courants"
        icon={<AlertCircle size={20} />}
      >
        <div className="space-y-4">
          <h4 className="font-semibold text-lg">Problèmes de connexion</h4>

          <div className="bg-gray-50 p-4 rounded border border-gray-200">
            <p className="font-medium">MetaMask ne se connecte pas à BiblioChain</p>
            <ul className="list-disc pl-5 mt-2 space-y-1">
              <li>Vérifiez que MetaMask est déverrouillé (connecté)</li>
              <li>Assurez-vous d'être sur le bon réseau (Ethereum Sepolia)</li>
              <li>Essayez de rafraîchir la page</li>
              <li>Cliquez sur le bouton "Rafraîchir la connexion" dans le menu de votre compte</li>
            </ul>
          </div>

          <div className="bg-gray-50 p-4 rounded border border-gray-200 mt-4">
            <p className="font-medium">Les transactions échouent ou restent en attente</p>
            <ul className="list-disc pl-5 mt-2 space-y-1">
              <li>Vérifiez que vous avez suffisamment d'ETH pour payer les frais de transaction</li>
              <li>Essayez d'augmenter le "Gas Price" dans MetaMask pour accélérer la transaction</li>
              <li>Si une transaction reste bloquée, vous pouvez utiliser la fonction "Remplacer" dans MetaMask</li>
            </ul>
          </div>

          <h4 className="font-semibold text-lg mt-6">Obtenir de l'ETH de test</h4>
          <p>
            Pour utiliser BiblioChain sur le réseau de test Sepolia, vous aurez besoin d'ETH de test :
          </p>
          <ol className="list-decimal pl-5 space-y-2">
            <li>Visitez le <a href="https://sepoliafaucet.com/" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">Sepolia Faucet</a></li>
            <li>Connectez-vous avec votre compte Alchemy ou créez-en un</li>
            <li>Entrez votre adresse Ethereum et demandez des ETH de test</li>
            <li>Attendez quelques minutes pour recevoir vos ETH de test</li>
          </ol>

          <div className="bg-blue-50 border-l-4 border-blue-400 p-4 rounded mt-4">
            <div className="flex">
              <HelpCircle size={24} className="text-blue-500 mr-2 flex-shrink-0" />
              <p>
                <strong>Besoin d'aide supplémentaire ?</strong> N'hésitez pas à contacter notre équipe de support à support@bibliochain.com
              </p>
            </div>
          </div>
        </div>
      </TutorialSection>

      <div className="mt-8 text-center">
        <p className="text-gray-600 mb-4">Prêt à commencer votre expérience avec BiblioChain ?</p>
        <div className="flex flex-wrap justify-center gap-4">
          <button
            onClick={() => setActiveTab('catalog')}
            className="bg-blue-600 text-white px-6 py-3 rounded-md font-medium flex items-center hover:bg-blue-700 transition"
          >
            <BookmarkIcon size={20} className="mr-2" />
            Explorer le catalogue
          </button>
          {!isConnected && (
            <button
              onClick={connectToMetaMask}
              className="bg-gray-800 text-white px-6 py-3 rounded-md font-medium flex items-center hover:bg-gray-900 transition"
            >
              <Wallet size={20} className="mr-2" />
              Connecter MetaMask (optionnel)
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default TutorialTab;
