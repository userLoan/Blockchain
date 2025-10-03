// migrations/2_deploy_moolahcoin.js
const MoolahCoin = artifacts.require("MoolahCoin");
module.exports = async (deployer, network, accounts) => {
  await deployer.deploy(MoolahCoin, accounts[0]);
};
