import React, { useEffect, useState, useContext } from 'react';

import { CoinContext } from '../context/coinContext';
import LineChart from './LineChart';

function ExchangeStats() {
    const { allCoin } = useContext(CoinContext);
    const [displayCoin, setDisplayCoin] = useState([]);
    const [searchTerm, setSearchTerm] = useState("");
    const [selectedCoinId, setSelectedCoinId] = useState("bitcoin");
    const [coinData, setCoinData] = useState({});
    const [historicalData, setHistoricalData] = useState({});


    const fetchCoinData = async () => {
        const options = {
            method: 'GET',
            headers: { accept: 'application/json', 'x-cg-demo-api-key': 'CG-aJz4uHjiwgSjkUFWCCYf3HmW' }
        };

        fetch(`https://api.coingecko.com/api/v3/coins/${selectedCoinId}`, options)
            .then(res => res.json())
            .then(res => setCoinData(res))
            .catch(err => console.error(err));
    };

    const fetchHistoricalData = async () => {
        const options = {
            method: 'GET',
            headers: { accept: 'application/json', 'x-cg-demo-api-key': 'CG-aJz4uHjiwgSjkUFWCCYf3HmW' }
        };

        fetch(`https://api.coingecko.com/api/v3/coins/${selectedCoinId}/market_chart?vs_currency=usd&days=10&interval=daily`, options)
            .then(res => res.json())
            .then(res => setHistoricalData(res))
            .catch(err => console.error(err));
    };

    useEffect(() => {
        fetchCoinData();
        fetchHistoricalData();
    }, [selectedCoinId]);

    useEffect(() => {
        setDisplayCoin(allCoin);
    }, [allCoin]);


    const handleSearch = (e) => {
        setSearchTerm(e.target.value);
    };

    const handleCoinClick = (coinId) => {
        setSelectedCoinId(coinId);
    };

    const searchHandler = () => {
        if (searchTerm === "") {
            setDisplayCoin(allCoin);
        } else {
            const filteredCoin = allCoin.filter((coin) => {
                return coin.name.toLowerCase().includes(searchTerm.toLowerCase());
            });
            setDisplayCoin(filteredCoin);
        }
    };


    const renderCoinBlock = (data) => {
        const isSelected = selectedCoinId === data.id;
        return (
            <div key={data.id} className={`grid grid-cols-2 items-center text-gray-200 text-sm p-2 mb-2 cursor-pointer ${isSelected ? "bg-gray-800" : ""}`} onClick={() => handleCoinClick(data.id)}>
                {/* Left: Token Image and Name */}
                <div className="flex items-center space-x-2">
                    <img className="w-8 h-8" src={data.image} alt={`${data.name} logo`} />
                    <span>{data.name + "-" + data.symbol}</span>
                </div>
                {/* Right: Price Change and Price */}
                <div className="text-right">
                    <p
                        className={`text-sm font-semibold ${(Math.floor(data.price_change_percentage_24h * 100) / 100) > 0 ? "text-green-400" : "text-red-400"
                            }`}
                    >
                        {(Math.floor(data.price_change_percentage_24h * 100) / 100) > 0 ? "+" : ""}{(Math.floor(data.price_change_percentage_24h * 100) / 100) ? (Math.floor(data.price_change_percentage_24h * 100) / 100) : "0.00"}%
                    </p>
                    <p className="text-green-400 text-sm font-medium">
                        ${"$" + parseFloat(data.current_price) ? parseFloat(data.current_price).toFixed(2) : "0.00"}
                    </p>
                </div>
            </div>
        );
    };


    return (
        <>
            <div className="p-4 m-2 border border-gray-700 rounded-md shadow-md shadow-black">
                <h2 className="text-xl font-mono text-gray-100 font-bold mb-4">Market</h2>

                {/* Search Input and Button */}
                <div className="flex mb-4">
                    <input
                        type="text"
                        value={searchTerm}
                        onChange={handleSearch}
                        placeholder="Search Tokens..."
                        className="p-2 w-full font-mono border text-gray-100 border-gray-600 rounded-l-md focus:outline-none "
                        required
                    />
                    <button
                        onClick={() => searchHandler()}
                        className="bg-blue-500 text-white px-4 py-2 rounded-r-md hover:bg-blue-600 focus:outline-none "
                    >
                        Search
                    </button>
                </div>


                <div className="grid grid-cols-2 text-gray-400 text-sm font-mono mb-2 rounded-lg bg-slate-700 p-2">
                    <span className="font-bold">Token</span>
                    <span className="font-bold text-sm text-right ">24h Change/Price</span>
                </div>


                {/* Limit the height and add vertical scrolling on small screens */}
                <div className="overflow-y-auto max-h-[400px] sm:max-h-[auto] sm:h-auto sm:grid-rows-5 ">

                    {
                        displayCoin.slice(0, 10).map((item) => {
                            return renderCoinBlock(item);
                        })
                    }

                </div>
            </div>

            {coinData ? (
                <div className="border p-4 m-2 border-gray-700 rounded-md shadow-md shadow-black">
                    <h2 className="text-xl font-mono text-gray-100 font-bold mb-4">Charts</h2>

                    {/* Row for Image and Token Name */}
                    {coinData.image && coinData.name && coinData.symbol && (
                        <div className="flex items-center space-x-4 mb-4">
                            <img
                                src={coinData.image?.small} // Fallback image
                                alt={`${coinData.name} logo`}
                                className="w-10 h-10"
                            />
                            <p className="text-gray-100 text-lg">
                                <b>
                                    {coinData.name} ({coinData.symbol?.toUpperCase()})
                                </b>
                            </p>
                        </div>
                    )}


                    {/* Chart Placeholder */}
                    <div className="h-90 p-1 rounded-md shadow-md ">
                        {historicalData ? (
                            <>
                                <LineChart hisdata={historicalData} />
                            </>
                        ) : (
                            <div className="flex justify-center items-center">
                                {/* Tailwind spinner */}
                                <div className="w-16 h-16 border-4 border-t-4 border-white-400 border-t-transparent rounded-full animate-spin"></div>
                            </div>
                        )}
                    </div>


                    <div className="mt-6 font-mono text-sm font-bold ">
                        <div className="overflow-x-auto">
                            <table className="table-auto w-full border-collapse border border-gray-700 ">
                                <thead className="bg-gray-800 ">
                                    <tr>
                                        <th className="border border-slate-900 px-4 py-2 text-gray-400">Metric</th>
                                        <th className="border border-slate-900 px-4 py-2 text-gray-400">Value</th>
                                    </tr>
                                </thead>
                                <tbody className="">
                                    <tr>
                                        <td className="border border-gray-700 px-4 py-2 text-gray-100">Current Price</td>
                                        <td className="border border-gray-700 px-4 py-2 text-gray-200">
                                            ${coinData?.market_data?.current_price["usd"]?.toLocaleString()}
                                        </td>
                                    </tr>
                                    <tr>
                                        <td className="border border-gray-700 px-4 py-2 text-gray-100">Market Cap</td>
                                        <td className="border border-gray-700 px-4 py-2 text-gray-200">
                                            ${coinData?.market_data?.market_cap["usd"]?.toLocaleString()}
                                        </td>
                                    </tr>
                                    <tr>
                                        <td className="border border-gray-700 px-4 py-2 text-gray-100">24 Hour High</td>
                                        <td className="border border-gray-700 px-4 py-2 text-gray-200">
                                            ${coinData?.market_data?.high_24h["usd"]?.toLocaleString()}
                                        </td>
                                    </tr>
                                    <tr>
                                        <td className="border border-gray-700 px-4 py-2 text-gray-100">24 Hour Low</td>
                                        <td className="border border-gray-700 px-4 py-2 text-gray-200">
                                            ${coinData?.market_data?.low_24h["usd"]?.toLocaleString()}
                                        </td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    </div>


                </div>
            ) : (
                <div className="flex justify-center items-center">
                    {/* Tailwind spinner for the loading state of coinData */}
                    <div className="w-16 h-16 border-4 border-t-4 border-white border-t-transparent rounded-full animate-spin"></div>
                </div>
            )}

        </>
    )
}

export default ExchangeStats
