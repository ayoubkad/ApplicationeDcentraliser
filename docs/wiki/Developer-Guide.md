# Developer Guide

This guide provides comprehensive information for developers who want to contribute to, deploy, or integrate with the Library DApp project.

## 📋 Table of Contents

1. [Development Setup](#development-setup)
2. [Project Structure](#project-structure)
3. [Smart Contract Development](#smart-contract-development)
4. [Frontend Development](#frontend-development)
5. [IPFS Integration](#ipfs-integration)
6. [Testing](#testing)
7. [Deployment](#deployment)
8. [Contributing](#contributing)

## 🛠️ Development Setup

### Prerequisites

Ensure you have the following installed:

- **Node.js** (v14 or higher)
- **npm** or **yarn**
- **Git**
- **MetaMask** browser extension
- **Ganache** for local blockchain
- **Truffle** framework

### Local Development Environment

1. **Clone the Repository**
   ```bash
   git clone https://github.com/ayoubkad/ApplicationeDcentraliser.git
   cd ApplicationeDcentraliser
   ```

2. **Install Dependencies**
   ```bash
   npm install
   ```

3. **Set Up Environment Variables**
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

4. **Start Ganache**
   ```bash
   # Using Ganache CLI
   ganache-cli --deterministic --accounts 10 --host 0.0.0.0 --port 7545
   
   # Or use Ganache GUI with these settings:
   # RPC Server: HTTP://127.0.0.1:7545
   # Network ID: 1337
   ```

5. **Deploy Smart Contracts**
   ```bash
   truffle migrate --reset
   ```

6. **Start Development Server**
   ```bash
   npm start
   ```

7. **Configure MetaMask**
   - Add local network (RPC: http://127.0.0.1:7545, Chain ID: 1337)
   - Import account using Ganache private key

### Development Tools

#### Recommended VS Code Extensions
- **Solidity**: Syntax highlighting for smart contracts
- **ES7+ React/Redux**: React development snippets
- **Prettier**: Code formatting
- **ESLint**: Code linting
- **GitLens**: Git integration

#### Useful Commands
```bash
# Compile contracts
truffle compile

# Run tests
npm test

# Deploy to specific network
truffle migrate --network sepolia

# Console interaction
truffle console

# Check contract size
truffle run contract-size
```

## 📁 Project Structure

```
ApplicationeDcentraliser/
├── contracts/                  # Smart contracts
│   ├── LibraryDApp.sol        # Main library contract
│   └── Migrations.sol         # Truffle migrations
├── migrations/                 # Deployment scripts
│   └── 1_deploy_library_dapp.js
├── src/                       # React frontend
│   ├── components/            # React components
│   │   ├── AdminTab.js       # Admin functionality
│   │   ├── CatalogTab.js     # Book catalog
│   │   ├── DashboardTab.js   # User dashboard
│   │   ├── MetaMaskConnect.js # Wallet connection
│   │   └── common/           # Reusable components
│   ├── services/             # Business logic
│   │   ├── Web3Service.js    # Blockchain interactions
│   │   ├── IPFSService.js    # IPFS operations
│   │   └── NotificationService.js
│   ├── utils/                # Utility functions
│   ├── styles/               # CSS and styling
│   └── App.js               # Main application
├── test/                     # Test suites
├── docs/                     # Documentation
│   └── wiki/                # Wiki documentation
├── public/                   # Static assets
├── truffle-config.js        # Truffle configuration
├── package.json             # Dependencies
└── README.md               # Project overview
```

### Key Components

#### Smart Contracts
- **LibraryDApp.sol**: Main contract handling users, books, and borrowing logic
- **Access Control**: Role-based permissions (Student, Professor, Admin)
- **Data Structures**: User, Book, and Borrow structs

#### Frontend Components
- **AdminTab**: Administrative interface
- **CatalogTab**: Book browsing and searching
- **DashboardTab**: User personal dashboard
- **MetaMaskConnect**: Wallet integration

#### Services
- **Web3Service**: Blockchain interaction layer
- **IPFSService**: Decentralized storage operations
- **NotificationService**: User feedback and alerts

## 🔗 Smart Contract Development

### Contract Architecture

The LibraryDApp smart contract is built with the following key features:

#### Core Data Structures

```solidity
// User roles
enum Role { Student, Professor, Admin }

// User information
struct User {
    string name;
    uint8 role;
    uint256 reputation;
    bool isRegistered;
}

// Book information
struct Book {
    uint id;
    string title;
    string author;
    string ipfsHash;
    bool isAvailable;
    address borrowedBy;
    uint currentBorrowId;
}

// Borrowing records
struct Borrow {
    uint bookId;
    address borrower;
    uint borrowTime;
    uint dueTime;
    bool returned;
    uint returnTime;
}
```

#### Key Functions

##### User Management
```solidity
function registerUser(string memory _name, uint8 _role) public
function isUserRegistered() public view returns (bool)
function getUserReputation() public view returns (uint256)
function updateUserReputation(address _user, uint256 _reputation) public onlyAdmin
```

##### Book Management
```solidity
function addBook(string memory _title, string memory _author, string memory _ipfsHash) public onlyAdmin
function getBook(uint _bookId) public view returns (Book memory)
function getAllBooks() public view returns (Book[] memory)
function updateBookAvailability(uint _bookId, bool _isAvailable) public onlyAdmin
```

##### Borrowing System
```solidity
function borrowBook(uint _bookId) public onlyRegistered
function returnBook(uint _borrowId) public onlyRegistered
function getBorrowHistory(address _user) public view returns (uint[] memory)
function isBookOverdue(uint _borrowId) public view returns (bool)
```

### Development Best Practices

#### Security Considerations

1. **Access Control**
   ```solidity
   modifier onlyAdmin() {
       require(users[msg.sender].role == uint8(Role.Admin), "Admin access required");
       _;
   }
   
   modifier onlyRegistered() {
       require(users[msg.sender].isRegistered, "User must be registered");
       _;
   }
   ```

2. **Input Validation**
   ```solidity
   require(_bookId > 0 && _bookId <= bookCount, "Invalid book ID");
   require(bytes(_title).length > 0, "Title cannot be empty");
   ```

3. **State Checks**
   ```solidity
   require(books[_bookId].isAvailable, "Book is not available");
   require(!borrows[_borrowId].returned, "Book already returned");
   ```

#### Gas Optimization

1. **Efficient Data Storage**
   - Use appropriate data types
   - Pack structs efficiently
   - Minimize storage operations

2. **Batch Operations**
   - Combine related operations
   - Use memory vs storage appropriately
   - Optimize loops and iterations

### Testing Smart Contracts

#### Test Structure
```javascript
// Example test file
const LibraryDApp = artifacts.require("LibraryDApp");
const { expect } = require('chai');

contract("LibraryDApp", (accounts) => {
  let libraryDApp;
  const admin = accounts[0];
  const student = accounts[1];
  
  beforeEach(async () => {
    libraryDApp = await LibraryDApp.new();
  });
  
  describe("User Registration", () => {
    it("should register a new user", async () => {
      await libraryDApp.registerUser("John Doe", 0, { from: student });
      const user = await libraryDApp.users(student);
      expect(user.name).to.equal("John Doe");
    });
  });
});
```

## ⚛️ Frontend Development

### React Architecture

The frontend is built using modern React patterns:

#### Component Structure

1. **Container Components**: Handle business logic and state
2. **Presentation Components**: Handle UI rendering
3. **Common Components**: Reusable UI elements
4. **Service Layer**: Abstract blockchain and IPFS interactions

#### State Management

The application uses React's built-in state management with:
- **useState**: Local component state
- **useEffect**: Side effects and lifecycle
- **useContext**: Global state sharing
- **Custom Hooks**: Reusable stateful logic

#### Web3 Integration

```javascript
// Web3Service example
class Web3Service {
  constructor() {
    this.web3 = null;
    this.contract = null;
    this.account = null;
  }
  
  async initialize() {
    if (window.ethereum) {
      this.web3 = new Web3(window.ethereum);
      await window.ethereum.request({ method: 'eth_requestAccounts' });
      this.account = (await this.web3.eth.getAccounts())[0];
      this.contract = new this.web3.eth.Contract(ABI, CONTRACT_ADDRESS);
    }
  }
  
  async callMethod(methodName, params = [], from = null) {
    const method = this.contract.methods[methodName](...params);
    return await method.call({ from: from || this.account });
  }
  
  async sendTransaction(methodName, params = [], options = {}) {
    const method = this.contract.methods[methodName](...params);
    return await method.send({ 
      from: this.account, 
      ...options 
    });
  }
}
```

### Component Development Guidelines

#### Component Structure
```javascript
import React, { useState, useEffect } from 'react';
import { SomeIcon } from 'lucide-react';
import { toast } from 'react-hot-toast';

const ComponentName = ({ prop1, prop2, onAction }) => {
  const [state, setState] = useState(initialState);
  
  useEffect(() => {
    // Side effects
  }, [dependencies]);
  
  const handleAction = async () => {
    try {
      // Action logic
      toast.success('Action completed successfully');
    } catch (error) {
      toast.error('Action failed: ' + error.message);
    }
  };
  
  return (
    <div className="component-container">
      {/* JSX content */}
    </div>
  );
};

export default ComponentName;
```

#### Styling Guidelines

The project uses TailwindCSS for styling:

1. **Utility Classes**: Use Tailwind utilities for common styles
2. **Component Classes**: Create custom classes for complex components
3. **Responsive Design**: Use responsive modifiers (sm:, md:, lg:)
4. **Dark Mode**: Consider dark mode compatibility

Example styling:
```javascript
<div className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow">
  <h2 className="text-xl font-semibold text-gray-800 mb-4">Title</h2>
  <p className="text-gray-600">Content</p>
</div>
```

## 📦 IPFS Integration

### IPFS Service Architecture

The IPFS service handles decentralized storage for book covers and content:

```javascript
class IPFSService {
  constructor() {
    this.gateways = [
      'http://127.0.0.1:8080/ipfs/',
      'https://cloudflare-ipfs.com/ipfs/',
      'https://ipfs.io/ipfs/',
      'https://gateway.ipfs.io/ipfs/'
    ];
    this.imageUrlCache = new Map();
  }
  
  async uploadFile(file) {
    const formData = new FormData();
    formData.append('file', file);
    
    const response = await fetch('http://127.0.0.1:5001/api/v0/add', {
      method: 'POST',
      body: formData
    });
    
    const result = await response.json();
    return result.Hash;
  }
  
  async generateIPFSImageUrl(ipfsHash) {
    if (this.imageUrlCache.has(ipfsHash)) {
      return this.imageUrlCache.get(ipfsHash);
    }
    
    // Try gateways in parallel
    const workingUrl = await this.findWorkingGateway(ipfsHash);
    if (workingUrl) {
      this.imageUrlCache.set(ipfsHash, workingUrl);
    }
    
    return workingUrl;
  }
}
```

### File Upload Process

1. **File Selection**: User selects file through file input
2. **Validation**: Check file type, size, and format
3. **Upload to IPFS**: Send file to local or remote IPFS node
4. **Get Hash**: Receive unique IPFS hash for the file
5. **Store Hash**: Save hash in smart contract
6. **Generate URL**: Create gateway URL for file access

### Performance Optimization

The IPFS service includes several optimizations:

- **Gateway Prioritization**: Test multiple gateways for best performance
- **Caching**: Cache working URLs to avoid repeated checks
- **Parallel Processing**: Test multiple gateways simultaneously
- **Fallback Handling**: Graceful degradation when gateways fail

## 🧪 Testing

### Test Structure

The project includes comprehensive testing at multiple levels:

#### Smart Contract Tests
```bash
# Run all contract tests
truffle test

# Run specific test file
truffle test test/LibraryDApp.test.js

# Run with coverage
npm run test:coverage
```

#### Frontend Tests
```bash
# Run React tests
npm test

# Run with coverage
npm test -- --coverage

# Run specific test
npm test -- --testNamePattern="User registration"
```

### Writing Tests

#### Smart Contract Test Example
```javascript
describe("Book Management", () => {
  it("should add a new book", async () => {
    const title = "Test Book";
    const author = "Test Author";
    const ipfsHash = "QmTest123";
    
    await libraryDApp.addBook(title, author, ipfsHash, { from: admin });
    
    const book = await libraryDApp.getBook(1);
    expect(book.title).to.equal(title);
    expect(book.author).to.equal(author);
    expect(book.ipfsHash).to.equal(ipfsHash);
    expect(book.isAvailable).to.be.true;
  });
});
```

#### Frontend Test Example
```javascript
import { render, screen, fireEvent } from '@testing-library/react';
import BookCard from '../components/BookCard';

test('renders book information correctly', () => {
  const book = {
    id: 1,
    title: 'Test Book',
    author: 'Test Author',
    isAvailable: true
  };
  
  render(<BookCard book={book} />);
  
  expect(screen.getByText('Test Book')).toBeInTheDocument();
  expect(screen.getByText('Test Author')).toBeInTheDocument();
  expect(screen.getByText('Available')).toBeInTheDocument();
});
```

### Test Coverage

Maintain high test coverage for:
- **Smart Contract Functions**: All public and external functions
- **Component Rendering**: All React components
- **User Interactions**: All user-triggered actions
- **Error Handling**: All error scenarios
- **Integration**: End-to-end user flows

## 🚀 Deployment

### Network Configuration

#### Local Development (Ganache)
```javascript
// truffle-config.js
development: {
  host: "127.0.0.1",
  port: 7545,
  network_id: "*",
  gas: 6721975,
  gasPrice: 20000000000
}
```

#### Testnet Deployment (Sepolia)
```javascript
sepolia: {
  provider: () => new HDWalletProvider(
    process.env.MNEMONIC,
    `https://sepolia.infura.io/v3/${process.env.INFURA_PROJECT_ID}`
  ),
  network_id: 11155111,
  gas: 4500000,
  gasPrice: 10000000000,
  confirmations: 2,
  timeoutBlocks: 200,
  skipDryRun: true
}
```

#### Mainnet Deployment
```javascript
mainnet: {
  provider: () => new HDWalletProvider(
    process.env.MAINNET_MNEMONIC,
    `https://mainnet.infura.io/v3/${process.env.INFURA_PROJECT_ID}`
  ),
  network_id: 1,
  gas: 4500000,
  gasPrice: 20000000000,
  confirmations: 2,
  timeoutBlocks: 200,
  skipDryRun: true
}
```

### Deployment Process

1. **Prepare Environment**
   ```bash
   # Set environment variables
   export MNEMONIC="your twelve word mnemonic"
   export INFURA_PROJECT_ID="your-infura-project-id"
   ```

2. **Deploy Contracts**
   ```bash
   # Deploy to testnet
   truffle migrate --network sepolia
   
   # Deploy to mainnet
   truffle migrate --network mainnet
   ```

3. **Verify Deployment**
   ```bash
   # Interact with deployed contract
   truffle console --network sepolia
   
   # Verify on Etherscan
   truffle run verify LibraryDApp --network sepolia
   ```

4. **Update Frontend Configuration**
   ```javascript
   // Update contract address and ABI
   const CONTRACT_ADDRESS = "0x..."; // Deployed contract address
   const CONTRACT_ABI = [...]; // Contract ABI
   ```

### Production Considerations

#### Performance Optimization
- Optimize contract bytecode
- Minimize gas usage
- Use efficient data structures
- Implement proper caching

#### Security Hardening
- Audit smart contracts
- Implement access controls
- Use secure random number generation
- Handle edge cases properly

#### Monitoring and Maintenance
- Set up error tracking
- Monitor transaction costs
- Track user activity
- Plan for upgrades

## 🤝 Contributing

### Development Workflow

1. **Fork the Repository**
   ```bash
   # Fork on GitHub, then clone
   git clone https://github.com/your-username/ApplicationeDcentraliser.git
   cd ApplicationeDcentraliser
   ```

2. **Create Feature Branch**
   ```bash
   git checkout -b feature/your-feature-name
   ```

3. **Make Changes**
   - Write code following project conventions
   - Add tests for new functionality
   - Update documentation as needed

4. **Test Changes**
   ```bash
   # Run all tests
   npm test
   truffle test
   
   # Check code style
   npm run lint
   ```

5. **Submit Pull Request**
   - Push branch to your fork
   - Create pull request on GitHub
   - Describe changes and rationale

### Code Style Guidelines

#### JavaScript/React
- Use ES6+ features
- Follow functional programming patterns
- Write descriptive variable names
- Add JSDoc comments for functions

#### Solidity
- Follow Solidity style guide
- Use explicit visibility modifiers
- Add NatSpec documentation
- Implement proper access controls

#### General
- Write clear commit messages
- Keep functions focused and small
- Handle errors gracefully
- Write comprehensive tests

### Review Process

All contributions go through:
1. **Automated Testing**: CI/CD pipeline runs tests
2. **Code Review**: Team members review changes
3. **Security Check**: Security implications assessed
4. **Documentation**: Ensure docs are updated
5. **Deployment Testing**: Test on testnet before mainnet

---

**Questions?** Join our [Discord](https://discord.gg/library-dapp) or open an [issue](https://github.com/ayoubkad/ApplicationeDcentraliser/issues) on GitHub.