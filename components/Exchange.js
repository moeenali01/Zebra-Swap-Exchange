import React, { useState, useEffect } from 'react';
import { SSRProvider } from '@react-aria/ssr';
import TradeHistory from './TradeHistory';
import ExchangeTradeModal from './ExchangeTradeModal';
import TradingViewWidget from './TradingViewWidget';


function Exchange() {

    const [displayPairs, setDisplayPairs] = useState([]);
    const [searchTerm, setSearchTerm] = useState("");
    const [selectedPair, setSelectedPair] = useState({});
    const [token1, setToken1] = useState("");
    const [token2, setToken2] = useState("");

    const allPairs =
        [
            { name: "wanBTC-WWAN", token1: "BTC", token2: "WWAN", img1: "./exchange/btc.png", img2: "./exchange/wan.png", symbol: "BINANCE:WANBTC" },
            { name: "wanUSDT-WWAN", token1: "wanUSDT", token2: "WWAN", img1: "./exchange/usdt.png", img2: "./exchange/wan.png", symbol: "BINANCE:WANUSDT" },
            { name: "WWAN-wanETH", token1: "WWAN", token2: "wanETH", img1: "./exchange/wan.png", img2: "./exchange/eth.png", symbol: "HTX:WANETH" },
            { name: "wanAVAX-WWAN", token1: "wanAVAX", token2: "WWAN", img1: "./exchange/avax.png", img2: "./exchange/wan.png", symbol: "BINANCE:AVAXUSDT" },
            { name: "wanDOGE-WWAN", token1: "wanDOGE", token2: "WWAN", img1: "./exchange/doge.png", img2: "./exchange/wan.png", symbol: "BINANCE:DOGEUSDT" },
            { name: "wanUSDC-WWAN", token1: "wanUSDC", token2: "WWAN", img1: "./exchange/usdc.png", img2: "./exchange/wan.png", symbol: "BYBIT:USDCUSDT" },
            { name: "wanBNB-WWAN", token1: "BNB", token2: "WWAN", img1: "./exchange/bnb.png", img2: "./exchange/wan.png", symbol: "BINANCE:BNBUSDT" },
            { name: "wanSUSHI-WWAN", token1: "wanSUSHI", token2: "WWAN", img1: "./exchange/sushi.png", img2: "./exchange/wan.png", symbol: "BINANCE:SUSHIUSDT" },
            { name: "EOS-WWAN", token1: "EOS", token2: "WWAN", img1: "./exchange/eos.png", img2: "./exchange/wan.png", symbol: "BINANCE:EOSUSDT" },
        ];


    useEffect(() => {
        setDisplayPairs(allPairs);
    }, []);

    const handleSearch = (e) => {
        setSearchTerm(e.target.value);
    };

    const searchHandler = () => {
        if (searchTerm === "") {
            setDisplayPairs(allPairs);
        } else {
            const filteredPairs = allPairs.filter((pair) =>
                pair.name.toLowerCase().includes(searchTerm.toLowerCase())
            );
            setDisplayPairs(filteredPairs);
        }
    };

    const handlePairClick = (pair) => {
        setSelectedPair(pair);
        setToken1(pair.token1);
        setToken2(pair.token2);
    };

    const [dimensions, setDimensions] = useState({
        width: 320,
        height: 280,
    });

    useEffect(() => {

        const handleResize = () => {
            setDimensions({
                width: window.innerWidth > 1024 ? "550" : "320",
                height: window.innerWidth > 1024 ? "400" : "280",
            });
        };

        handleResize(); // Set initial size
        window.addEventListener("resize", handleResize);

        return () => window.removeEventListener("resize", handleResize);
    }, []);



    return (
        <>
            <SSRProvider>
                <div className="grid grid-cols-1 lg:grid-cols-[1.6fr_2.6fr_2fr] gap-4 p-4 h-auto">
                    <div className="p-4 m-2 border h-[600px]  overflow-hidden border-gray-700 rounded-md shadow-md shadow-black">
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
                            <span className="font-bold">Token Pairs</span>
                        </div>
                        <div className="overflow-y-auto max-h-[400px] font-mono sm:max-h-[auto] sm:h-auto sm:grid-rows-5">
                            {displayPairs.map((pair) => (
                                <div
                                    key={pair.name}
                                    className={`p-2 text-sm cursor-pointer flex items-center gap-2 ${pair.name === selectedPair.name ? "bg-gray-800 text-white" : "text-gray-200"
                                        }`}
                                    onClick={() => handlePairClick(pair)}
                                >
                                    {/* Overlapping Images */}
                                    <div className="relative w-10 h-10">
                                        <img
                                            src={pair.img2}
                                            alt={`${pair.name} Image 2`}
                                            className="absolute top-3 left-3 w-6 h-6 rounded-full border border-gray-300"
                                        />
                                        <img
                                            src={pair.img1}
                                            alt={`${pair.name} Image 1`}
                                            className="absolute top-0 left-0 w-6 h-6 rounded-full border border-gray-300"
                                        />
                                    </div>

                                    {/* Token Name */}
                                    <span>{pair.name}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                    {/* Middle portion */}
                    <div className="mt-2">
                        <div
                            className="p-3 border border-gray-700 rounded-md shadow-md shadow-black"
                            style={{ width: "100%" }}
                        >
                            <h1 className="text-xl font-mono mb-2 text-gray-100 font-bold">
                                Crypto Price Chart
                            </h1>
                            <TradingViewWidget
                                width={dimensions.width}
                                height={dimensions.height}
                                symbol={selectedPair.symbol}
                            />
                        </div>
                    </div>



                    {/* Trade Modal */}
                    <div className="p-4 m-2 border border-gray-700 rounded-md shadow-md shadow-black">
                        <h2 className="text-xl font-mono text-gray-100 font-bold mb-4">Trade Tokens</h2>
                        <div>
                            <ExchangeTradeModal selectedPair={selectedPair} token1={(token1 == "WWAN") ? "WAN" : token1} token2={(token2 == "WWAN") ? "WAN" : token2} />
                            <TradeHistory />
                        </div>
                    </div>
                </div>
            </SSRProvider>
        </>
    );
}

export default Exchange;
