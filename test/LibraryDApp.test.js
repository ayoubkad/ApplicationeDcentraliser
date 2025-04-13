const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("LibraryDApp - addBook", function () {
    let libraryDApp;
    let owner;
    let otherAccount;

    beforeEach(async function () {
        [owner, otherAccount] = await ethers.getSigners();
        const LibraryDApp = await ethers.getContractFactory("LibraryDApp");
        libraryDApp = await LibraryDApp.deploy();
        await libraryDApp.deployed();
    });

    it("Devrait permettre à l'admin d'ajouter un livre avec des données valides", async function () {
        const title = "Le Petit Prince";
        const author = "Antoine de Saint-Exupéry";
        const ipfsHash = "QmXoypizjW3WknFiJnKLwHCnL72vedxjQkDDP1mXWo6uco";

        await expect(libraryDApp.addBook(title, author, ipfsHash))
            .to.emit(libraryDApp, "BookAdded")
            .withArgs(1, title, author, ipfsHash);

        const book = await libraryDApp.books(1);
        expect(book.id).to.equal(1);
        expect(book.title).to.equal(title);
        expect(book.author).to.equal(author);
        expect(book.ipfsHash).to.equal(ipfsHash);
        expect(book.isAvailable).to.equal(true);
    });

    it("Devrait échouer si un non-admin essaie d'ajouter un livre", async function () {
        const title = "Le Petit Prince";
        const author = "Antoine de Saint-Exupéry";
        const ipfsHash = "QmXoypizjW3WknFiJnKLwHCnL72vedxjQkDDP1mXWo6uco";

        await expect(
            libraryDApp.connect(otherAccount).addBook(title, author, ipfsHash)
        ).to.be.revertedWith("LibraryDApp: seul l'administrateur peut executer cette fonction");
    });

    it("Devrait échouer si le titre est vide", async function () {
        const title = "";
        const author = "Antoine de Saint-Exupéry";
        const ipfsHash = "QmXoypizjW3WknFiJnKLwHCnL72vedxjQkDDP1mXWo6uco";

        await expect(
            libraryDApp.addBook(title, author, ipfsHash)
        ).to.be.revertedWith("LibraryDApp: le titre ne peut pas etre vide");
    });

    it("Devrait échouer si l'auteur est vide", async function () {
        const title = "Le Petit Prince";
        const author = "";
        const ipfsHash = "QmXoypizjW3WknFiJnKLwHCnL72vedxjQkDDP1mXWo6uco";

        await expect(
            libraryDApp.addBook(title, author, ipfsHash)
        ).to.be.revertedWith("LibraryDApp: l'auteur ne peut pas etre vide");
    });

    it("Devrait échouer si le hash IPFS est vide", async function () {
        const title = "Le Petit Prince";
        const author = "Antoine de Saint-Exupéry";
        const ipfsHash = "";

        await expect(
            libraryDApp.addBook(title, author, ipfsHash)
        ).to.be.revertedWith("LibraryDApp: le hash IPFS ne peut pas etre vide");
    });

    it("Devrait incrémenter correctement le compteur de livres", async function () {
        const title1 = "Livre 1";
        const author1 = "Auteur 1";
        const ipfsHash1 = "QmHash1";

        const title2 = "Livre 2";
        const author2 = "Auteur 2";
        const ipfsHash2 = "QmHash2";

        await libraryDApp.addBook(title1, author1, ipfsHash1);
        expect(await libraryDApp.bookCount()).to.equal(1);

        await libraryDApp.addBook(title2, author2, ipfsHash2);
        expect(await libraryDApp.bookCount()).to.equal(2);
    });
}); 