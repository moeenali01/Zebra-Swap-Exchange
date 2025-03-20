import { use } from 'react';
import { createContext, useState, useEffect } from 'react';

export const CoinContext = createContext();

const CoinContextProvider = ({ children }) => {

    const [allCoin, setAllCoin] = useState([]);

    const fetchAllCoin = async () => {
        const options = {
            method: 'GET',
            headers: { accept: 'application/json', 'x-cg-demo-api-key': 'CG-aJz4uHjiwgSjkUFWCCYf3HmW' }
        };

        fetch('https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd', options)
            .then(res => res.json())
            .then(res => setAllCoin(res))
            .catch(err => console.error(err));
    };

    useEffect(() => {
        fetchAllCoin();
    }, []);

    const contextValue = {
        allCoin
    }

    return (
        <CoinContext.Provider value={contextValue}>
            {children}
        </CoinContext.Provider>
    )
}

export default CoinContextProvider;