
const LibraryDApp = artifacts.require("LibraryDApp");

module.exports = function(deployer) {
  deployer.deploy(LibraryDApp);
};