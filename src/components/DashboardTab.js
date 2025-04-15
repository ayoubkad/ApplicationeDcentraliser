import React from 'react';
import { Clock } from 'lucide-react';

const userLoans = [
  { id: 101, bookId: 5, title: "Introduction à la Sociologie", author: "Anthony Giddens", dueDate: "2025-04-20" },
  { id: 102, bookId: 7, title: "Littérature Française du XXe siècle", author: "Michel Raimond", dueDate: "2025-04-15" }
];

const DashboardTab = ({ setActiveTab, handleReturnBook, userReputation = 85 }) => {
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-[#2A3B8C] mb-6">Mon Espace Personnel</h1>

      <div className="bg-white rounded-lg shadow-md p-6 mb-8">
        <div className="flex flex-wrap justify-between items-center">
          <div className="mb-4 md:mb-0">
            <h2 className="text-lg font-semibold text-gray-800">Votre Réputation</h2>
            <p className="text-gray-600 text-sm mb-2">Une bonne réputation vous permet d'emprunter plus de livres.</p>
            <div className="flex items-center">
              <span className="inline-block px-2 py-1 text-xs rounded bg-[#F8F9FA] text-gray-600 mr-2">
                Minimum: 50
              </span>
              <span className="inline-block px-2 py-1 text-xs rounded bg-[#4CAF50]/20 text-[#4CAF50]">
                Votre score: {userReputation}
              </span>
            </div>
          </div>
          <div className="w-full md:w-1/3">
            <div className="relative">
              <div className="w-32 h-32 mx-auto">
                <svg viewBox="0 0 36 36" className="circular-chart">
                  <path className="circle-bg" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="#F8F9FA" strokeWidth="2" />
                  <path className="circle" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="#4CAF50" strokeWidth="2" strokeDasharray={`${userReputation}, 100`} />
                  <text x="18" y="20.5" textAnchor="middle" className="text-[#4CAF50] font-bold text-3xl">{userReputation}</text>
                </svg>
              </div>
              <div className="text-center text-sm text-gray-600 mt-2">
                <span className="text-[#FFD700]">★</span> Excellente réputation
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="mb-8">
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
                        <button className="text-[#2A3B8C] hover:text-[#1F2D6B] transition" onClick={() => handleReturnBook(loan.bookId)}>Retourner</button>
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
        </div>
      </div>

      <style jsx>{`
        .circular-chart {
          width: 100%;
          height: auto;
        }
        .circle {
          transition: stroke-dasharray 0.5s ease;
        }
      `}</style>
    </div>
  );
};

export default DashboardTab;
