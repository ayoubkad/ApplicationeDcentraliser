import React, { useEffect, useState } from 'react';
import { Clock, Award, TrendingUp, AlertTriangle } from 'lucide-react';

// Import du service Web3 et du composant de test
import Web3Service from '../services/Web3Service';
import TestButton from './common/TestButton';

const userLoans = [
  { id: 101, bookId: 5, title: "Introduction à la Sociologie", author: "Anthony Giddens", dueDate: "2025-04-20" },
  { id: 102, bookId: 7, title: "Littérature Française du XXe siècle", author: "Michel Raimond", dueDate: "2025-04-15" }
];

const DashboardTab = ({ setActiveTab, handleReturnBook, userReputation = 80 }) => {
  const [animatedScore, setAnimatedScore] = useState(0);
  const [showReputationDetails, setShowReputationDetails] = useState(false);
  const [actualReputation, setActualReputation] = useState(userReputation);
  const [isLoading, setIsLoading] = useState(true);

  const getReputationLevel = (score) => {
    if (score >= 90) return { level: 'Premium', color: 'text-purple-600', benefits: ['Emprunts prolongés', 'Réservations prioritaires', 'Accès VIP'] };
    if (score >= 75) return { level: 'Or', color: 'text-yellow-600', benefits: ['Emprunts multiples', 'Délai prolongé'] };
    if (score >= 50) return { level: 'Argent', color: 'text-gray-600', benefits: ['Emprunts standards'] };
    return { level: 'Bronze', color: 'text-amber-700', benefits: ['Emprunts limités'] };
  };

  // Charge la réputation depuis le smart contract
  useEffect(() => {
    const loadReputationFromBlockchain = async () => {
      try {
        setIsLoading(true);
        const web3Service = new Web3Service();
        await web3Service.initialize();
        
        // Récupérer la réputation depuis le smart contract
        const reputation = await web3Service.getUserReputation();
        
        if (reputation && !isNaN(Number(reputation))) {
          setActualReputation(Number(reputation));
        } else {
          console.log("Utilisation de la réputation par défaut:", userReputation);
          setActualReputation(userReputation);
        }
      } catch (error) {
        console.error("Erreur lors du chargement de la réputation:", error);
        setActualReputation(userReputation);
      } finally {
        setIsLoading(false);
      }
    };

    loadReputationFromBlockchain();
    
    // Écouter les événements de mise à jour de réputation
    window.addEventListener('reputationUpdated', (event) => {
      if (event.detail && !isNaN(Number(event.detail.reputation))) {
        setActualReputation(Number(event.detail.reputation));
      }
    });
    
    return () => {
      window.removeEventListener('reputationUpdated', () => {});
    };
  }, [userReputation]);

  const reputationInfo = getReputationLevel(actualReputation);

  useEffect(() => {
    const timer = setTimeout(() => {
      setAnimatedScore(actualReputation);
    }, 300);
    
    return () => clearTimeout(timer);
  }, [actualReputation]);

  return (
    <div className="container mx-auto px-4 py-6">
      <h1 className="text-2xl font-bold text-[#2A3B8C] mb-6 flex items-center">
        <Award className="mr-2" /> Mon Espace Personnel
      </h1>

      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-gray-800">Niveau de Réputation</h2>
              <div className={`${reputationInfo.color} font-bold text-lg px-4 py-1 rounded-full bg-opacity-10`}>
                {reputationInfo.level}
              </div>
            </div>
            
            <div className="relative pt-4">
              <div className="flex justify-between mb-2">
                <span className="text-sm font-medium text-gray-700">{animatedScore}/100</span>
                <button 
                  onClick={() => setShowReputationDetails(!showReputationDetails)}
                  className="text-[#2A3B8C] text-sm hover:underline"
                >
                  Voir les détails
                </button>
              </div>
              
              <div className="w-full bg-gray-200 rounded-full h-3">
                <div 
                  className="h-3 rounded-full transition-all duration-1000 ease-out"
                  style={{ 
                    width: `${animatedScore}%`,
                    background: `linear-gradient(90deg, #4CAF50 ${animatedScore}%, #e5e7eb ${animatedScore}%)`
                  }}
                />
              </div>

              {showReputationDetails && (
                <div className="mt-4 p-4 bg-gray-50 rounded-lg animate-fadeIn">
                  <h3 className="font-semibold mb-2">Avantages du niveau {reputationInfo.level}:</h3>
                  <ul className="space-y-2">
                    {reputationInfo.benefits.map((benefit, index) => (
                      <li key={index} className="flex items-center text-sm">
                        <TrendingUp className="w-4 h-4 mr-2 text-[#2A3B8C]" />
                        {benefit}
                      </li>
                    ))}
                  </ul>
                  
                  <div className="mt-4 pt-3 border-t border-gray-200">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Score actuel:</span>
                      <span className="text-xl font-bold text-[#2A3B8C]">{actualReputation}</span>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      Ce score est enregistré sur la blockchain et évolue en fonction de vos interactions avec la bibliothèque.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 bg-blue-50 rounded-lg">
              <h3 className="text-sm font-medium text-gray-600">Emprunts Total</h3>
              <p className="text-2xl font-bold text-[#2A3B8C]">{userLoans.length}</p>
            </div>
            <div className="p-4 bg-green-50 rounded-lg">
              <h3 className="text-sm font-medium text-gray-600">Retours à Temps</h3>
              <p className="text-2xl font-bold text-green-600">100%</p>
            </div>
            <div className="p-4 bg-purple-50 rounded-lg col-span-2">
              <div className="flex justify-between items-center">
                <h3 className="text-sm font-medium text-gray-600">Score de Réputation Actuel</h3>
                {isLoading ? (
                  <div className="animate-pulse bg-gray-300 rounded-lg h-6 w-12"></div>
                ) : (
                  <div className="flex items-center">
                    <span className="text-yellow-500 mr-1">★</span>
                    <span className="text-2xl font-bold text-purple-700">{actualReputation}</span>
                  </div>
                )}
              </div>
              <div className="mt-2 text-xs text-gray-500">
                Mis à jour en temps réel depuis la blockchain
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="mb-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold text-gray-800">Vos Emprunts Actifs</h2>
          <span className="text-sm bg-[#2A3B8C]/10 text-[#2A3B8C] font-medium px-3 py-1 rounded-full">{userLoans.length} livre(s) emprunté(s)</span>
        </div>

        {userLoans.length > 0 ? (
          <div className="bg-white rounded-lg shadow-md overflow-hidden">
            <table className="w-full">
              <thead className="bg-[#2A3B8C]/5">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-[#2A3B8C] uppercase tracking-wider">Titre</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-[#2A3B8C] uppercase tracking-wider">Auteur</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-[#2A3B8C] uppercase tracking-wider">Date limite</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-[#2A3B8C] uppercase tracking-wider">Statut</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-[#2A3B8C] uppercase tracking-wider">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {userLoans.map(loan => {
                  const dueDate = new Date(loan.dueDate);
                  const today = new Date();
                  const daysLeft = Math.ceil((dueDate - today) / (1000 * 60 * 60 * 24));

                  let statusColor = "text-[#4CAF50] bg-[#4CAF50]/10";
                  let statusText = `${daysLeft} jours restants`;

                  if (daysLeft <= 2) {
                    statusColor = "text-[#FFD700] bg-[#FFD700]/10";
                    statusText = `${daysLeft} jour${daysLeft > 1 ? 's' : ''} - Retour imminent !`;
                  }

                  if (daysLeft < 0) {
                    statusColor = "text-[#E53935] bg-[#E53935]/10";
                    statusText = `En retard de ${Math.abs(daysLeft)} jour${Math.abs(daysLeft) > 1 ? 's' : ''} !`;
                  }

                  return (
                    <tr key={loan.id} className="hover:bg-[#F8F9FA] transition">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{loan.title}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{loan.author}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{loan.dueDate}</td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${statusColor}`}>
                          {statusText}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <button className="text-white bg-[#2A3B8C] hover:bg-[#1F2D6B] px-3 py-1 rounded-md transition" onClick={() => handleReturnBook(loan.bookId)}>Retourner</button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow-md p-6 text-center">
            <p className="text-gray-500">Vous n'avez pas d'emprunts actifs.</p>
            <button
              className="mt-4 px-4 py-2 bg-[#2A3B8C] text-white rounded-md font-medium hover:bg-[#1F2D6B] transition"
              onClick={() => setActiveTab('catalog')}
            >
              Parcourir le catalogue
            </button>
          </div>
        )}
      </div>

      <div>
        <h2 className="text-lg font-semibold text-gray-800 mb-4">Historique d'Emprunts</h2>
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex justify-center">
            <div className="text-center text-gray-500">
              <Clock size={32} className="mx-auto mb-2 text-gray-400" />
              <p>Votre historique d'emprunts s'affichera ici.</p>
              <p className="text-xs mt-2 text-[#2A3B8C]">Les transactions sont enregistrées de manière transparente sur la blockchain</p>
            </div>
          </div>
          
          {/* Bouton de test pour les administrateurs */}
          <TestButton userReputation={actualReputation} />
        </div>
      </div>

      <style>{`
        .circular-chart {
          width: 100%;
          height: auto;
        }
        .circle {
          transition: stroke-dasharray 1.5s ease-in-out;
          transform-origin: center;
          transform: rotate(-90deg);
        }
        .circle-bg {
          transform-origin: center;
          transform: rotate(-90deg);
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(-10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .reputation-chart {
          animation: fadeIn 0.5s ease-in-out;
        }
        .animate-fadeIn {
          animation: fadeIn 0.3s ease-out;
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
        .animate-pulse {
          animation: pulse 1.5s cubic-bezier(0.4, 0, 0.6, 1) infinite;
        }
      `}</style>
    </div>
  );
};

export default DashboardTab;
