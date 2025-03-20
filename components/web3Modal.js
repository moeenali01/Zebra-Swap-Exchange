import { createWeb3Modal, defaultConfig } from '@web3modal/ethers5/react'


// Your WalletConnect Cloud project ID
export const projectId = "65a3d1371b0c39534a49d0ea40cf884c";


const wanchainMainnet = {
    chainId: 888,
    name: 'Wanchain',
    currency: 'WAN',
    explorerUrl: 'https://www.wanscan.org',
    rpcUrl: 'https://gwan-ssl.wandevs.org:56891'
};
const wanchainTestnet = {
    chainId: 999,
    name: 'Wanchain Testnet',
    currency: 'WAN',
    explorerUrl: 'https://testnet.wanscan.org',
    rpcUrl: 'https://gwan-ssl.wandevs.org:46891'
};


const metadata = {
    name: 'zebraswap',
    description: 'zebraswap Website',
    url: 'https://web3modal.com', // origin must match your domain & subdomain
    icons: ['https://avatars.githubusercontent.com/u/37784886']
}

// 4. Create Ethers config
const ethersConfig = defaultConfig({
    /*Required*/
    metadata,

    /*Optional*/
    enableEIP6963: true, // true by default
    enableInjected: true, // true by default
    enableCoinbase: true, // true by default
    rpcUrl: '...', // used for the Coinbase SDK
    defaultChainId: 999, // used for the Coinbase SDK
})

// 5. Create a Web3Modal instance
createWeb3Modal({
    ethersConfig,
    chains: [wanchainMainnet, wanchainTestnet],
    projectId,
    enableAnalytics: true, // Optional - defaults to your Cloud configuration
    enableOnramp: true // Optional - false as default
})


export function Web3Modal({ children }) {
    return children
}