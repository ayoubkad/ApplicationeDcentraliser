// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

contract LibraryDApp {
    // Rôles des utilisateurs
    enum Role { Student, Professor, Admin }

    // Structure pour un utilisateur
    struct User {
        string name;           // Nom de l'utilisateur
        uint8 role;            // Rôle (étudiant, professeur, admin)
        uint256 reputation;    // Score de réputation (0-100)
        bool isRegistered;     // Vérifie si l'utilisateur est inscrit
    }

    // Structure pour un livre
    struct Book {
        uint id;              // Identifiant unique du livre
        string title;         // Titre du livre
        string author;        // Auteur du livre
        string ipfsHash;      // Hash IPFS de la couverture
        bool isAvailable;     // Disponibilité du livre
        address borrowedBy;   // Adresse de l'emprunteur (0x0 si disponible)
        uint currentBorrowId; // ID de l'emprunt en cours (0 si non emprunté)
    }

    // Structure pour un emprunt
    struct Borrow {
        uint bookId;          // ID du livre emprunté
        address borrower;     // Adresse de l'emprunteur
        uint borrowTime;      // Timestamp de l'emprunt
        uint dueTime;         // Date limite de retour
        bool returned;        // Statut du retour
        uint returnTime;      // Timestamp du retour (0 si non retourné)
    }

    // Mappings pour stocker les données
    mapping(address => User) public users;                // Utilisateur par adresse Ethereum
    mapping(uint => Book) public books;                   // Livre par ID
    mapping(uint => Borrow) public borrows;               // Emprunts par ID
    mapping(address => uint[]) public userBorrowHistory;  // Historique des emprunts par utilisateur

    // Compteurs
    uint public bookCount;         // Nombre total de livres
    uint public borrowCount;       // Nombre total d'emprunts

    // Adresse de l'administrateur
    address public admin;

    // Durée d'emprunt (en secondes, ici 7 jours)
    uint public constant BORROW_DURATION = 7 days;
    
    // Limite minimum et maximum de réputation
    uint public constant MIN_REPUTATION = 0;
    uint public constant MAX_REPUTATION = 100;
    uint public constant MIN_BORROW_REPUTATION = 50;
    
    // Pénalités et récompenses de réputation
    uint public constant LATE_RETURN_PENALTY = 10;
    uint public constant ON_TIME_RETURN_REWARD = 5;

    // Événements pour notifier le frontend
    event UserRegistered(address indexed user, string name, Role role);
    event BookAdded(uint indexed bookId, string title, string author, string ipfsHash);
    event BookBorrowed(uint indexed bookId, address indexed borrower, uint dueTime, uint borrowId);
    event BookReturned(uint indexed bookId, address indexed borrower, uint reputation, bool isLate);
    event ReputationUpdated(address indexed user, uint newReputation);
    // Événement pour notifier la suppression d'un livre
    event BookRemoved(uint indexed bookId, string title);

    // Modificateur pour restreindre l'accès à l'administrateur
    modifier onlyAdmin() {
        require(msg.sender == admin, "LibraryDApp: seul l'administrateur peut executer cette fonction");
        _;
    }

    // Modificateur pour vérifier qu'un utilisateur est inscrit
    modifier onlyRegistered() {
        require(users[msg.sender].isRegistered, "LibraryDApp: utilisateur non inscrit");
        _;
    }
    
    // Modificateur pour vérifier qu'un livre existe
    modifier bookExists(uint _bookId) {
        require(_bookId > 0 && _bookId <= bookCount, "LibraryDApp: livre inexistant");
        _;
    }
    
    // Modificateur pour vérifier si un utilisateur peut emprunter des livres
    modifier canBorrow() {
        require(users[msg.sender].reputation >= MIN_BORROW_REPUTATION, "LibraryDApp: reputation trop basse pour emprunter");
        _;
    }

    // Constructeur : initialise l'administrateur comme le déployeur du contrat
    constructor() { 
        admin = msg.sender;
        users[admin] = User("Admin", uint8(Role.Admin), MAX_REPUTATION, true);
        emit UserRegistered(admin, "Admin", Role.Admin);
    }

    // Inscription d'un utilisateur
    function registerUser(string memory _name, Role _role) public {
        require(!users[msg.sender].isRegistered, "LibraryDApp: utilisateur deja inscrit");
        require(_role != Role.Admin, "LibraryDApp: le role Admin ne peut pas etre choisi");
        require(bytes(_name).length > 0, "LibraryDApp: le nom ne peut pas etre vide");
        
        users[msg.sender] = User(_name, uint8(_role), 80, true); // Réputation initiale : 80
        emit UserRegistered(msg.sender, _name, _role);
    }

    // Ajout d'un livre (par l'administrateur)
    function addBook(string memory _title, string memory _author, string memory _ipfsHash) 
        public onlyAdmin 
    {
        require(bytes(_title).length > 0, "LibraryDApp: le titre ne peut pas etre vide");
        require(bytes(_author).length > 0, "LibraryDApp: l'auteur ne peut pas etre vide");
        require(bytes(_ipfsHash).length > 0, "LibraryDApp: le hash IPFS ne peut pas etre vide");
        
        bookCount++;
        books[bookCount] = Book(bookCount, _title, _author, _ipfsHash, true, address(0), 0);
        emit BookAdded(bookCount, _title, _author, _ipfsHash);
    }

    // Emprunt d'un livre
    function borrowBook(uint _bookId) public onlyRegistered bookExists(_bookId) canBorrow {
        Book storage book = books[_bookId];
        
        require(book.isAvailable, "LibraryDApp: livre non disponible");

        book.isAvailable = false;
        book.borrowedBy = msg.sender;
        
        borrowCount++;
        uint dueTime = block.timestamp + BORROW_DURATION;
        
        borrows[borrowCount] = Borrow(_bookId, msg.sender, block.timestamp, dueTime, false, 0);
        book.currentBorrowId = borrowCount;
        userBorrowHistory[msg.sender].push(borrowCount);

        emit BookBorrowed(_bookId, msg.sender, dueTime, borrowCount);
    }

    // Retour d'un livre
    function returnBook(uint _bookId) public onlyRegistered bookExists(_bookId) {
        Book storage book = books[_bookId];
        
        require(book.borrowedBy == msg.sender, "LibraryDApp: vous n'avez pas emprunte ce livre");
        require(book.currentBorrowId > 0, "LibraryDApp: aucun emprunt actif pour ce livre");
        
        uint borrowId = book.currentBorrowId;
        Borrow storage borrow = borrows[borrowId];
        
        require(!borrow.returned, "LibraryDApp: ce livre a deja ete retourne");
        
        book.isAvailable = true;
        book.borrowedBy = address(0);
        book.currentBorrowId = 0;
        
        borrow.returned = true;
        borrow.returnTime = block.timestamp;
        
        // Ajustement de la réputation
        bool isLate = block.timestamp > borrow.dueTime;
        updateReputation(msg.sender, isLate);
        
        emit BookReturned(_bookId, msg.sender, users[msg.sender].reputation, isLate);
    }
    
    // Mise à jour de la réputation
    function updateReputation(address _user, bool _isLate) private {
        User storage user = users[_user];
        
        if (_isLate) {
            // Pénalité pour retard
            if (user.reputation > LATE_RETURN_PENALTY) {
                user.reputation -= LATE_RETURN_PENALTY;
            } else {
                user.reputation = MIN_REPUTATION;
            }
        } else {
            // Bonus pour ponctualité
            if (user.reputation + ON_TIME_RETURN_REWARD <= MAX_REPUTATION) {
                user.reputation += ON_TIME_RETURN_REWARD;
            } else {
                user.reputation = MAX_REPUTATION;
            }
        }
        
        emit ReputationUpdated(_user, user.reputation);
    }

    // Consultation de l'historique des emprunts d'un utilisateur
    function getUserBorrowHistory(address _user) 
        public view returns (uint[] memory) 
    {
        return userBorrowHistory[_user];
    }

    // Fonction utilitaire pour obtenir les détails d'un emprunt
    function getBorrowDetails(uint _borrowId) 
        public view returns (Borrow memory) 
    {
        require(_borrowId > 0 && _borrowId <= borrowCount, "LibraryDApp: emprunt inexistant");
        return borrows[_borrowId];
    }
    
    // Obtenir les emprunts actifs d'un utilisateur
    function getUserActiveLoans(address _user) 
        public view returns (uint[] memory) 
    {
        uint[] memory history = userBorrowHistory[_user];
        uint activeCount = 0;
        
        // Compter les emprunts actifs
        for (uint i = 0; i < history.length; i++) {
            if (!borrows[history[i]].returned) {
                activeCount++;
            }
        }
        
        // Créer le tableau de résultats
        uint[] memory activeLoans = new uint[](activeCount);
        uint index = 0;
        
        // Remplir le tableau
        for (uint i = 0; i < history.length; i++) {
            if (!borrows[history[i]].returned) {
                activeLoans[index] = history[i];
                index++;
            }
        }
        
        return activeLoans;
    }
    
    // Vérifier si un livre peut être emprunté
    function isBookAvailable(uint _bookId) public view bookExists(_bookId) returns (bool) {
        return books[_bookId].isAvailable;
    }
    
    // Obtenir la réputation d'un utilisateur
    function getUserReputation(address _user) public view returns (uint) {
        require(users[_user].isRegistered, "LibraryDApp: utilisateur non inscrit");
        return users[_user].reputation;
    }
    
   
    // Fonction de test pour modifier la réputation (réservée à l'administrateur)
    //cette fonction est utilisée pour les tests (supprimer apres les tests
    function setReputationForTesting(address _user, uint _newReputation) public onlyAdmin {
        require(users[_user].isRegistered, "LibraryDApp: utilisateur non inscrit");
        require(_newReputation <= MAX_REPUTATION, "LibraryDApp: reputation trop elevee");
        
        users[_user].reputation = _newReputation;
        emit ReputationUpdated(_user, _newReputation);
    }

    // Suppression d'un livre (par l'administrateur)
        function removeBook(uint _bookId) public onlyAdmin bookExists(_bookId) {
            Book storage book = books[_bookId];
            require(book.isAvailable, "LibraryDApp: livre actuellement emprunte, impossible de supprimer");

            // Sauvegarder le titre pour l'événement
            string memory title = book.title;

            // Supprimer le livre en réinitialisant ses données
            delete books[_bookId];

            emit BookRemoved(_bookId, title);
        }

    /**
     * @notice Vérifie si un livre existe dans la bibliothèque
     * @param _bookId L'identifiant du livre à vérifier
     * @return bool Retourne true si le livre existe, false sinon
     */
    function doesBookExist(uint _bookId) public view returns (bool) {
        return (_bookId > 0 && _bookId <= bookCount);
    }

    /**
     * @notice Vérifie si une adresse est un utilisateur enregistré
     * @param _userAddress L'adresse à vérifier
     * @return bool Retourne true si l'utilisateur est enregistré, false sinon
     */
    function isUserRegistered(address _userAddress) public view returns (bool) {
        // Vérifie si l'utilisateur existe dans le mapping des utilisateurs
        return users[_userAddress].isRegistered;
    }
}