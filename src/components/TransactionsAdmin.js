import React, { useState, useEffect } from 'react';
import web3Service from '../services/Web3Service';

const TransactionsAdmin = () => {
  const [transactions, setTransactions] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [error, setError] = useState(null);
  const [activeFilter, setActiveFilter] = useState('all'); // 'all', 'emprunts', 'retours'

  useEffect(() => {
    const checkAdminAndLoadData = async () => {
      try {
        // Vérifier si l'utilisateur est admin
        const admin = await web3Service.isAdmin();
        setIsAdmin(admin);
        
        if (admin) {
          await loadTransactions();
        } else {
          setError("Accès réservé aux administrateurs");
          setIsLoading(false);
        }
      } catch (error) {
        console.error("Erreur lors de la vérification des droits admin:", error);
        setError("Erreur de vérification des droits admin: " + error.message);
        setIsLoading(false);
      }
    };
    
    checkAdminAndLoadData();
  }, []);

  const loadTransactions = async () => {
    setIsLoading(true);
    try {
      // Récupérer les emprunts
      const borrowEvents = await web3Service.contract.getPastEvents('BorrowBook', {
        fromBlock: 0,
        toBlock: 'latest'
      });
      
      // Récupérer les retours
      const returnEvents = await web3Service.contract.getPastEvents('ReturnBook', {
        fromBlock: 0,
        toBlock: 'latest'
      });
      
      // Formater les événements
      const formattedBorrows = await Promise.all(borrowEvents.map(async (event) => {
        const { borrowId, bookId, user, timestamp } = event.returnValues;
        
        // Récupérer les infos du livre
        let bookDetails = { title: `Livre #${bookId}`, author: 'Inconnu' };
        try {
          const book = await web3Service.getBook(bookId);
          if (book) {
            bookDetails = {
              title: book.title || `Livre #${bookId}`,
              author: book.author || 'Inconnu'
            };
          }
        } catch (err) {
          console.warn(`Impossible de récupérer les détails du livre ${bookId}:`, err);
        }
        
        return {
          id: borrowId,
          type: 'emprunt',
          bookId: bookId,
          user: user,
          timestamp: new Date(parseInt(timestamp) * 1000).toISOString(),
          livre: bookDetails,
          blockNumber: event.blockNumber,
          transactionHash: event.transactionHash
        };
      }));
      
      const formattedReturns = await Promise.all(returnEvents.map(async (event) => {
        const { borrowId, bookId, user, timestamp } = event.returnValues;
        
        // Récupérer les infos du livre
        let bookDetails = { title: `Livre #${bookId}`, author: 'Inconnu' };
        try {
          const book = await web3Service.getBook(bookId);
          if (book) {
            bookDetails = {
              title: book.title || `Livre #${bookId}`,
              author: book.author || 'Inconnu'
            };
          }
        } catch (err) {
          console.warn(`Impossible de récupérer les détails du livre ${bookId}:`, err);
        }
        
        return {
          id: borrowId,
          type: 'retour',
          bookId: bookId,
          user: user,
          timestamp: new Date(parseInt(timestamp) * 1000).toISOString(),
          livre: bookDetails,
          blockNumber: event.blockNumber,
          transactionHash: event.transactionHash
        };
      }));
      
      // Combiner et trier par date (plus récent d'abord)
      const allTransactions = [...formattedBorrows, ...formattedReturns].sort((a, b) => {
        return new Date(b.timestamp) - new Date(a.timestamp);
      });
      
      setTransactions(allTransactions);
      setIsLoading(false);
    } catch (error) {
      console.error("Erreur lors du chargement des transactions:", error);
      setError("Erreur lors du chargement des transactions: " + error.message);
      setIsLoading(false);
    }
  };
  
  // Filtrer les transactions selon le type choisi
  const filteredTransactions = activeFilter === 'all' 
    ? transactions 
    : transactions.filter(tx => tx.type === activeFilter);
  
  // Formatage de l'adresse
  const formatAddress = (address) => {
    return `${address.substring(0, 6)}...${address.substring(address.length - 4)}`;
  };
  
  // Formatage de la date
  const formatDate = (isoDate) => {
    const date = new Date(isoDate);
    return date.toLocaleString();
  };

  // Affichage conditionnel selon les droits admin
  if (!isAdmin && !isLoading) {
    return (
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <div className="flex items-center justify-center h-40">
          <div className="text-center">
            <div className="text-red-500 mb-2">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <h2 className="text-xl font-bold text-gray-800 mb-2">Accès restreint</h2>
            <p className="text-gray-600">
              Seuls les administrateurs peuvent consulter les transactions.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow overflow-hidden">
      <div className="bg-gradient-to-r from-purple-600 to-indigo-600 px-6 py-4">
        <h2 className="text-white text-xl font-bold">Historique des transactions</h2>
        <p className="text-purple-100 text-sm">Suivez tous les emprunts et retours de livres</p>
      </div>
      
      {/* Filtres */}
      <div className="bg-gray-50 px-6 py-3 border-b flex flex-wrap items-center justify-between">
        <div className="flex space-x-2 mb-2 md:mb-0">
          <button 
            onClick={() => setActiveFilter('all')}
            className={`px-3 py-1 rounded-full text-sm font-medium ${
              activeFilter === 'all' 
                ? 'bg-indigo-100 text-indigo-800' 
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            Tous
          </button>
          <button 
            onClick={() => setActiveFilter('emprunt')}
            className={`px-3 py-1 rounded-full text-sm font-medium ${
              activeFilter === 'emprunt' 
                ? 'bg-blue-100 text-blue-800' 
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            Emprunts
          </button>
          <button 
            onClick={() => setActiveFilter('retour')}
            className={`px-3 py-1 rounded-full text-sm font-medium ${
              activeFilter === 'retour' 
                ? 'bg-green-100 text-green-800' 
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            Retours
          </button>
        </div>
        
        <div className="flex items-center">
          <button 
            onClick={loadTransactions}
            className="bg-indigo-50 text-indigo-600 px-3 py-1 rounded text-sm font-medium hover:bg-indigo-100 transition flex items-center"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Actualiser
          </button>
        </div>
      </div>
      
      {/* Contenu */}
      <div className="px-6 py-4">
        {isLoading ? (
          <div className="flex justify-center items-center h-60">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
          </div>
        ) : error ? (
          <div className="bg-red-50 text-red-700 p-4 rounded-md">
            <div className="font-medium">Erreur</div>
            <div className="text-sm">{error}</div>
          </div>
        ) : filteredTransactions.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <div className="text-5xl mb-4">📚</div>
            <p>Aucune transaction à afficher</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    ID
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Type
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Utilisateur
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Livre
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredTransactions.map((transaction) => (
                  <tr key={`${transaction.type}-${transaction.id}-${transaction.blockNumber}`}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {transaction.id}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        transaction.type === 'emprunt' 
                          ? 'bg-blue-100 text-blue-800' 
                          : 'bg-green-100 text-green-800'
                      }`}>
                        {transaction.type === 'emprunt' ? 'Emprunt' : 'Retour'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900" title={transaction.user}>
                        {formatAddress(transaction.user)}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {transaction.livre.title}
                      </div>
                      <div className="text-sm text-gray-500">
                        {transaction.livre.author}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatDate(transaction.timestamp)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      
      {/* Footer avec stats */}
      {!isLoading && !error && (
        <div className="bg-gray-50 px-6 py-3 border-t">
          <div className="flex flex-wrap gap-3">
            <div className="text-sm text-gray-500">
              <span className="font-medium text-indigo-600">{transactions.length}</span> transactions au total
            </div>
            <div className="text-sm text-gray-500">
              <span className="font-medium text-blue-600">
                {transactions.filter(tx => tx.type === 'emprunt').length}
              </span> emprunts
            </div>
            <div className="text-sm text-gray-500">
              <span className="font-medium text-green-600">
                {transactions.filter(tx => tx.type === 'retour').length}
              </span> retours
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TransactionsAdmin; 