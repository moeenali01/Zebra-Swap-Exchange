import { ethers } from 'ethers';
// import CustomDexABI from "./CustomDex.json";
import CustomTokenABI from "./CustomTokenABI.json";
// import ZebraSwapABI from "./ZebraSwapABI.json"
import ZebraSwap2ABI from "./ZebraSwap2.0ABI.json";

import ZebraExchangeABI from "./ZebraExchangeABI.json";
import ZebraExchange2ABI from "./ZebraExchange2ABI.json";


export const tokenContract = async (address) => {
    const provider = new ethers.providers.Web3Provider(window.ethereum);
    const { ethereum } = window;

    if (ethereum) {
        const signer = provider.getSigner();

        const contractReader = new ethers.Contract(address, CustomTokenABI, signer);
        return contractReader;
    }
};

// export const contract = async () => {
//     const provider = new ethers.providers.Web3Provider(window.ethereum);
//     const { ethereum } = window;

//     if (ethereum) {
//         const signer = provider.getSigner();

//         const contractReader = new ethers.Contract("0xBe0de23359F40e1e1dB7011e5253AfA7eE966B43", ZebraSwapABI, signer);
//         return contractReader;
//     }
// };
export const contract = async () => {
    const provider = new ethers.providers.Web3Provider(window.ethereum);
    const { ethereum } = window;

    if (ethereum) {
        const signer = provider.getSigner();

        const contractReader = new ethers.Contract("0x091a19D021D1a37B7e5d50051c99E1CaedFf8f70", ZebraSwap2ABI, signer);
        return contractReader;
    }
};
export const contractExc = async () => {
    const provider = new ethers.providers.Web3Provider(window.ethereum);
    const { ethereum } = window;

    if (ethereum) {
        const signer = provider.getSigner();

        const contractReader = new ethers.Contract("0x25548B6c461470b38cF12110e7cB4f7Dc48aB66B", ZebraExchangeABI, signer);
        return contractReader;
    }
};
export const contractExc2 = async () => {
    const provider = new ethers.providers.Web3Provider(window.ethereum);
    const { ethereum } = window;

    if (ethereum) {
        const signer = provider.getSigner();

        const contractReader = new ethers.Contract("0x90DE427381D7c6AC3267B88730f07F0e4a8e2f48", ZebraExchange2ABI, signer);
        return contractReader;
    }
};

