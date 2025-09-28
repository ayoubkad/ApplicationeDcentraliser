# Decentralized Library Application (Library DApp)

A decentralized library management application built on Ethereum blockchain, IPFS, and React.

![Library DApp](./Diagramme/Screenshot%202025-09-28%20220615.png)

## Overview

This decentralized application (DApp) enables the management of a university library on the Ethereum blockchain. It provides a complete system for user registration, book management, borrowing operations, and a reputation system—all secured by blockchain technology.

### Key Features

- **User Management**: Registration with different roles (Student, Professor)
- **Book Catalog**: Add, browse, and remove books
- **Borrowing System**: Check out and return books with due dates
- **Reputation System**: Rewards for on-time returns and penalties for late returns
- **Decentralized Storage**: IPFS integration for book cover storage
- **Intuitive User Interface**: Easy navigation between features

## Technical Architecture

### Frontend
- React.js for the user interface
- Web3.js for blockchain interaction
- IPFS for decentralized image storage
- TailwindCSS for styling

### Backend / Blockchain
- Solidity Smart Contracts deployed on Ethereum
- Truffle for development, testing, and deployment
- Ganache for local blockchain development

## Prerequisites

- Node.js (v14 or higher)
- NPM or Yarn
- MetaMask or another browser-compatible Ethereum wallet
- Ganache for local development

## Installation

1. Clone this repository:
   ```
   git clone https://github.com/ayoubkad/ApplicationeDcentraliser.git
   cd ApplicationeDcentraliser
   ```

2. Install dependencies:
   ```
   npm install
   ```

3. Start Ganache (GUI or CLI):
   ```
   ganache-cli
   ```

4. Deploy smart contracts:
   ```
   truffle migrate --reset
   ```

5. Start React application:
   ```
   npm start
   ```

6. Open [http://localhost:3000](http://localhost:3000) in your browser

## MetaMask Configuration

1. Install the MetaMask extension in your browser
2. Connect MetaMask to your local Ganache network (typically http://127.0.0.1:7545 with Chain ID 1337)
3. Import an account from Ganache using the private key

## Deployment on Test Networks

To deploy on a test network like Sepolia:

1. Configure your `.env` file with your private key and Infura API key
2. Run the migration command for the target network:
   ```
   truffle migrate --network sepolia
   ```

## Testing

Run tests with Truffle:

```
npm test
```

or

```
truffle test
```

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Contact

For questions or suggestions, please open an issue on GitHub.
