# API Documentation

This documentation covers all the APIs and interfaces available in the Library DApp, including smart contract methods, Web3 service functions, and IPFS integration.

## 📋 Table of Contents

1. [Smart Contract API](#smart-contract-api)
2. [Web3 Service API](#web3-service-api)
3. [IPFS Service API](#ipfs-service-api)
4. [Frontend Component APIs](#frontend-component-apis)
5. [Utility Functions](#utility-functions)
6. [Error Handling](#error-handling)
7. [Integration Examples](#integration-examples)

## 🔗 Smart Contract API

The LibraryDApp smart contract provides the core blockchain functionality.

### Contract Address
```javascript
// The contract address will be set after deployment
const CONTRACT_ADDRESS = "0x..."; // Replace with actual deployed address
```

### User Management Functions

#### `registerUser(string memory _name, uint8 _role)`
Registers a new user in the system.

**Parameters:**
- `_name`: User's full name
- `_role`: User role (0=Student, 1=Professor, 2=Admin)

**Returns:** None (emits event)

**Events:** `UserRegistered(address user, string name, uint8 role)`

**Example:**
```javascript
await contract.methods.registerUser("John Doe", 0).send({ from: userAddress });
```

#### `isUserRegistered()`
Checks if the calling address is registered.

**Parameters:** None

**Returns:** `bool` - true if registered

**Example:**
```javascript
const isRegistered = await contract.methods.isUserRegistered().call({ from: userAddress });
```

#### `getUserReputation()`
Gets the reputation score of the calling user.

**Parameters:** None

**Returns:** `uint256` - reputation score (0-100)

**Example:**
```javascript
const reputation = await contract.methods.getUserReputation().call({ from: userAddress });
```

#### `updateUserReputation(address _user, uint256 _reputation)`
Updates a user's reputation (admin only).

**Parameters:**
- `_user`: User's address
- `_reputation`: New reputation score (0-100)

**Access:** Admin only

**Example:**
```javascript
await contract.methods.updateUserReputation(userAddress, 75).send({ from: adminAddress });
```

### Book Management Functions

#### `addBook(string memory _title, string memory _author, string memory _ipfsHash)`
Adds a new book to the catalog.

**Parameters:**
- `_title`: Book title
- `_author`: Book author
- `_ipfsHash`: IPFS hash for book cover/content

**Returns:** `uint` - book ID

**Access:** Admin only

**Events:** `BookAdded(uint bookId, string title, string author)`

**Example:**
```javascript
await contract.methods.addBook("The Great Gatsby", "F. Scott Fitzgerald", "QmXYZ...").send({ from: adminAddress });
```

#### `getBook(uint _bookId)`
Retrieves book information.

**Parameters:**
- `_bookId`: Book identifier

**Returns:** Book struct containing:
- `id`: Book ID
- `title`: Book title
- `author`: Book author
- `ipfsHash`: IPFS content hash
- `isAvailable`: Availability status
- `borrowedBy`: Current borrower address
- `currentBorrowId`: Current borrow ID

**Example:**
```javascript
const book = await contract.methods.getBook(1).call();
console.log(book.title, book.isAvailable);
```

#### `getAllBooks()`
Retrieves all books in the catalog.

**Parameters:** None

**Returns:** Array of Book structs

**Example:**
```javascript
const books = await contract.methods.getAllBooks().call();
```

#### `updateBookAvailability(uint _bookId, bool _isAvailable)`
Updates book availability status.

**Parameters:**
- `_bookId`: Book identifier
- `_isAvailable`: New availability status

**Access:** Admin only

**Example:**
```javascript
await contract.methods.updateBookAvailability(1, false).send({ from: adminAddress });
```

### Borrowing Functions

#### `borrowBook(uint _bookId)`
Borrows a book for the calling user.

**Parameters:**
- `_bookId`: Book identifier

**Returns:** `uint` - borrow ID

**Requirements:**
- User must be registered
- Book must be available
- User must not exceed borrowing limit

**Events:** `BookBorrowed(uint borrowId, uint bookId, address borrower, uint dueTime)`

**Example:**
```javascript
const borrowId = await contract.methods.borrowBook(1).send({ from: userAddress });
```

#### `returnBook(uint _borrowId)`
Returns a borrowed book.

**Parameters:**
- `_borrowId`: Borrow identifier

**Requirements:**
- Must be the borrower
- Book must not be already returned

**Events:** `BookReturned(uint borrowId, uint bookId, address borrower, bool onTime)`

**Example:**
```javascript
await contract.methods.returnBook(borrowId).send({ from: userAddress });
```

#### `getBorrowHistory(address _user)`
Gets borrowing history for a user.

**Parameters:**
- `_user`: User address

**Returns:** Array of borrow IDs

**Example:**
```javascript
const history = await contract.methods.getBorrowHistory(userAddress).call();
```

#### `isBookOverdue(uint _borrowId)`
Checks if a borrowed book is overdue.

**Parameters:**
- `_borrowId`: Borrow identifier

**Returns:** `bool` - true if overdue

**Example:**
```javascript
const isOverdue = await contract.methods.isBookOverdue(borrowId).call();
```

### Administrative Functions

#### `isAdmin()`
Checks if the calling address is an admin.

**Parameters:** None

**Returns:** `bool` - true if admin

**Example:**
```javascript
const isAdmin = await contract.methods.isAdmin().call({ from: userAddress });
```

#### `getRegisteredUsers()`
Gets all registered user addresses.

**Parameters:** None

**Returns:** Array of addresses

**Access:** Admin only

**Example:**
```javascript
const users = await contract.methods.getRegisteredUsers().call({ from: adminAddress });
```

## 🌐 Web3 Service API

The Web3Service class provides a higher-level interface to interact with the smart contract.

### Class: Web3Service

#### Constructor
```javascript
const web3Service = new Web3Service();
```

#### `initialize(requestConnection = false)`
Initializes the Web3 connection and loads the contract.

**Parameters:**
- `requestConnection`: Whether to request MetaMask connection

**Returns:** `Promise<boolean>` - success status

**Example:**
```javascript
const success = await web3Service.initialize(true);
if (success) {
    console.log("Connected successfully");
}
```

#### `getAccount()`
Gets the current connected account address.

**Returns:** `string` - account address

**Example:**
```javascript
const account = web3Service.getAccount();
```

#### `callViewMethod(methodName, params = [])`
Calls a read-only contract method.

**Parameters:**
- `methodName`: Contract method name
- `params`: Array of parameters

**Returns:** `Promise<any>` - method result

**Example:**
```javascript
const isRegistered = await web3Service.callViewMethod('isUserRegistered', []);
const book = await web3Service.callViewMethod('getBook', [1]);
```

#### `sendTransaction(methodName, params = [], options = {})`
Sends a transaction to the contract.

**Parameters:**
- `methodName`: Contract method name
- `params`: Array of parameters
- `options`: Transaction options (gas, gasPrice, etc.)

**Returns:** `Promise<TransactionReceipt>` - transaction receipt

**Example:**
```javascript
const receipt = await web3Service.sendTransaction('borrowBook', [1], {
    gas: 200000,
    gasPrice: '20000000000'
});
```

#### `isUserRegistered()`
Convenience method to check user registration.

**Returns:** `Promise<boolean>`

**Example:**
```javascript
const registered = await web3Service.isUserRegistered();
```

#### `getUserReputation()`
Convenience method to get user reputation.

**Returns:** `Promise<number>`

**Example:**
```javascript
const reputation = await web3Service.getUserReputation();
```

#### `getAllBooks()`
Convenience method to get all books.

**Returns:** `Promise<Array>` - array of book objects

**Example:**
```javascript
const books = await web3Service.getAllBooks();
```

## 📁 IPFS Service API

The IPFSService class handles decentralized storage operations.

### Class: IPFSService

#### Constructor
```javascript
const ipfsService = new IPFSService();
```

#### `uploadFile(file)`
Uploads a file to IPFS.

**Parameters:**
- `file`: File object to upload

**Returns:** `Promise<string>` - IPFS hash

**Example:**
```javascript
const fileInput = document.getElementById('fileInput');
const file = fileInput.files[0];
const hash = await ipfsService.uploadFile(file);
```

#### `generateIPFSImageUrl(ipfsHash)`
Generates a working URL for an IPFS image.

**Parameters:**
- `ipfsHash`: IPFS content hash

**Returns:** `Promise<string>` - working gateway URL

**Example:**
```javascript
const imageUrl = await ipfsService.generateIPFSImageUrl('QmXYZ...');
```

#### `getIPFSImageUrl(ipfsHash)`
Legacy method for getting IPFS image URL.

**Parameters:**
- `ipfsHash`: IPFS content hash

**Returns:** `Promise<string>` - gateway URL

**Example:**
```javascript
const imageUrl = await ipfsService.getIPFSImageUrl('QmXYZ...');
```

#### `clearImageCache()`
Clears the internal image URL cache.

**Parameters:** None

**Returns:** None

**Example:**
```javascript
ipfsService.clearImageCache();
```

#### `checkIPFSNodeStatus()`
Checks the status of the local IPFS node.

**Returns:** `Promise<Object>` - node status information

**Example:**
```javascript
const status = await ipfsService.checkIPFSNodeStatus();
console.log('Connected:', status.connected);
```

## ⚛️ Frontend Component APIs

### MetaMaskConnect Component

#### Props
```javascript
interface MetaMaskConnectProps {
    web3Service?: Web3Service;
    onConnect?: (account: string) => void;
    onDisconnect?: () => void;
    showNotification?: (message: string, type: string) => void;
}
```

#### Usage
```javascript
<MetaMaskConnect
    web3Service={web3Service}
    onConnect={(account) => console.log('Connected:', account)}
    onDisconnect={() => console.log('Disconnected')}
    showNotification={(msg, type) => toast(msg, { type })}
/>
```

### BookCard Component

#### Props
```javascript
interface BookCardProps {
    book: Book;
    onBorrow?: (bookId: number) => void;
    onReturn?: (borrowId: number) => void;
    isOwner?: boolean;
    userRole?: string;
}
```

#### Usage
```javascript
<BookCard
    book={book}
    onBorrow={(id) => borrowBook(id)}
    onReturn={(id) => returnBook(id)}
    isOwner={book.borrowedBy === currentUser}
    userRole="student"
/>
```

### Notification Service

#### `showNotification(message, type, duration)`
Displays a notification to the user.

**Parameters:**
- `message`: Notification text
- `type`: 'success', 'error', 'warning', 'info'
- `duration`: Display time in milliseconds

**Example:**
```javascript
import { toast } from 'react-hot-toast';

const showSuccess = (message) => toast.success(message);
const showError = (message) => toast.error(message);
const showWarning = (message) => toast(message, { icon: '⚠️' });
```

## 🛠️ Utility Functions

### IPFS Utilities

#### `isValidCid(cid)`
Validates an IPFS Content Identifier.

**Parameters:**
- `cid`: String to validate

**Returns:** `boolean`

**Example:**
```javascript
import { isValidCid } from '../utils/ipfsUtils';

if (isValidCid(hash)) {
    // Process valid IPFS hash
}
```

#### `downloadPdfFromIPFS(ipfsHash, filename)`
Downloads a PDF file from IPFS.

**Parameters:**
- `ipfsHash`: IPFS content hash
- `filename`: Desired filename

**Returns:** `Promise<void>`

**Example:**
```javascript
import { downloadPdfFromIPFS } from '../utils/ipfsUtils';

await downloadPdfFromIPFS('QmXYZ...', 'book.pdf');
```

#### `verifyIpfsIntegrity(ipfsHash, expectedSize)`
Verifies IPFS content integrity.

**Parameters:**
- `ipfsHash`: IPFS content hash
- `expectedSize`: Expected file size

**Returns:** `Promise<boolean>`

### Web3 Utilities

#### `formatAddress(address)`
Formats an Ethereum address for display.

**Parameters:**
- `address`: Ethereum address

**Returns:** `string` - formatted address

**Example:**
```javascript
const formatted = formatAddress('0x1234...5678'); // "0x1234...5678"
```

#### `formatTimestamp(timestamp)`
Formats a blockchain timestamp.

**Parameters:**
- `timestamp`: Unix timestamp

**Returns:** `string` - formatted date

**Example:**
```javascript
const date = formatTimestamp(1640995200); // "Jan 1, 2022"
```

## ⚠️ Error Handling

### Common Error Types

#### MetaMask Errors
```javascript
// User rejected transaction
{
    code: 4001,
    message: "User rejected the request."
}

// Insufficient funds
{
    code: -32603,
    message: "Insufficient funds for gas * price + value"
}
```

#### Smart Contract Errors
```javascript
// Custom revert messages
{
    message: "execution reverted: Book is not available"
}

// Access control errors
{
    message: "execution reverted: Admin access required"
}
```

#### IPFS Errors
```javascript
// Network timeout
{
    message: "IPFS timeout: Unable to fetch content"
}

// Invalid hash
{
    message: "Invalid IPFS hash format"
}
```

### Error Handling Patterns

#### Try-Catch with User Feedback
```javascript
const borrowBook = async (bookId) => {
    try {
        setLoading(true);
        const result = await web3Service.sendTransaction('borrowBook', [bookId]);
        toast.success('Book borrowed successfully!');
        return result;
    } catch (error) {
        console.error('Borrow error:', error);
        
        if (error.code === 4001) {
            toast.error('Transaction cancelled by user');
        } else if (error.message.includes('not available')) {
            toast.error('Book is currently unavailable');
        } else {
            toast.error('Failed to borrow book: ' + error.message);
        }
        
        throw error;
    } finally {
        setLoading(false);
    }
};
```

#### Retry Logic for IPFS
```javascript
const fetchImageWithRetry = async (hash, maxRetries = 3) => {
    for (let i = 0; i < maxRetries; i++) {
        try {
            return await ipfsService.generateIPFSImageUrl(hash);
        } catch (error) {
            if (i === maxRetries - 1) throw error;
            await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
        }
    }
};
```

## 📝 Integration Examples

### Complete Book Borrowing Flow
```javascript
const handleBorrowBook = async (bookId) => {
    try {
        // 1. Check if user is registered
        const isRegistered = await web3Service.isUserRegistered();
        if (!isRegistered) {
            throw new Error('Please register first');
        }
        
        // 2. Check book availability
        const book = await web3Service.callViewMethod('getBook', [bookId]);
        if (!book.isAvailable) {
            throw new Error('Book is not available');
        }
        
        // 3. Send borrow transaction
        const receipt = await web3Service.sendTransaction('borrowBook', [bookId], {
            gas: 200000
        });
        
        // 4. Update UI
        toast.success('Book borrowed successfully!');
        refreshBookList();
        refreshUserDashboard();
        
        return receipt;
    } catch (error) {
        handleBorrowError(error);
        throw error;
    }
};
```

### IPFS File Upload with Progress
```javascript
const uploadBookCover = async (file, onProgress) => {
    try {
        // Validate file
        if (!file.type.startsWith('image/')) {
            throw new Error('Please select an image file');
        }
        
        if (file.size > 5 * 1024 * 1024) { // 5MB limit
            throw new Error('File size must be less than 5MB');
        }
        
        // Upload to IPFS
        onProgress?.(0);
        const hash = await ipfsService.uploadFile(file);
        onProgress?.(50);
        
        // Verify upload
        const url = await ipfsService.generateIPFSImageUrl(hash);
        onProgress?.(100);
        
        return { hash, url };
    } catch (error) {
        onProgress?.(-1); // Error state
        throw error;
    }
};
```

### Real-time Event Listening
```javascript
const subscribeToBookEvents = () => {
    const contract = web3Service.contract;
    
    // Listen for book borrowed events
    contract.events.BookBorrowed({
        filter: {},
        fromBlock: 'latest'
    })
    .on('data', (event) => {
        const { bookId, borrower } = event.returnValues;
        toast.info(`Book ${bookId} was borrowed`);
        refreshBookList();
    })
    .on('error', console.error);
    
    // Listen for book returned events
    contract.events.BookReturned({
        filter: {},
        fromBlock: 'latest'
    })
    .on('data', (event) => {
        const { bookId } = event.returnValues;
        toast.info(`Book ${bookId} was returned`);
        refreshBookList();
    })
    .on('error', console.error);
};
```

## 📚 Additional Resources

- **Smart Contract Source**: Check `contracts/LibraryDApp.sol`
- **Service Implementation**: See `src/services/` directory
- **Component Examples**: Browse `src/components/` directory
- **Utility Functions**: Review `src/utils/` directory

For more detailed implementation examples, see the [Developer Guide](Developer-Guide.md).