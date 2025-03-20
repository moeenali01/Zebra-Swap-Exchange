require("@nomicfoundation/hardhat-toolbox");

/** @type import('hardhat/config').HardhatUserConfig */

const NEXT_PUBLIC_SEPOLIA_RPC = "https://eth-sepolia.g.alchemy.com/v2/Fg25P-vat-3CcvHO9fPAgbyOPfPmhnVl";
const NEXT_PUBLIC_PRIVATE_KEY = "";
module.exports = {
  solidity: "0.8.20",
  defaultNetwork: "sepolia",
  networks: {
    hardhat: {},
    sepolia: {
      url: NEXT_PUBLIC_SEPOLIA_RPC,
      accounts: [`0x${NEXT_PUBLIC_PRIVATE_KEY}`],
    },
  },
};
