import React from 'react';
import Web3Service from '../../services/Web3Service';

// Composant de bouton de test pour modifier la réputation (admin uniquement)
const TestButton = ({ userReputation }) => {
  const handleTestReputation = async () => {
    try {
      const web3Service = new Web3Service();
      await web3Service.initialize();
      
      // Tester si l'utilisateur est administrateur
      const isAdmin = await web3Service.isAdmin();
      
      if (!isAdmin) {
        alert("Cette fonctionnalité est réservée à l'administrateur!");
        return;
      }
      
      // Définir une réputation de test (par exemple, 80)
      const testReputation = 80;
      const userAddress = web3Service.getAccount();
      
      // Appeler la méthode de test du contrat
      const result = await web3Service.callContractMethod(
        'setReputationForTesting',
        [userAddress, testReputation],
        { gas: 200000 }
      );
      
      console.log("Test de réputation effectué:", result);
      alert(`Réputation modifiée à ${testReputation} pour test. Vérifiez les événements.`);
      
    } catch (error) {
      console.error("Erreur lors du test de réputation:", error);
      alert("Erreur lors du test: " + error.message);
    }
  };
  
  return (
    <div className="mt-4 p-3 bg-gray-100 rounded-lg">
      <div className="flex justify-between items-center">
        <div className="text-sm text-gray-600">
          <span className="font-medium">Mode Test</span>
          <span className="ml-2 text-xs">(Admin uniquement)</span>
        </div>
        <button
          onClick={handleTestReputation}
          className="px-3 py-1 bg-purple-600 text-white text-sm rounded hover:bg-purple-700 transition"
        >
          Définir réputation à 80
        </button>
      </div>
      <p className="text-xs text-gray-500 mt-2">
        Ce bouton permet de tester la mise à jour de la réputation via le smart contract.
      </p>
    </div>
  );
};

export default TestButton; 