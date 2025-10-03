const Condos = artifacts.require("Condos");

module.exports = async function (deployer, network, accounts) {
  await deployer.deploy(Condos, accounts[0]); // owner ban đầu
};
