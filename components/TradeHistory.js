import React, { useEffect, useState } from 'react';
import { ethers } from "ethers";


import {
    getTradeHistory,
} from "../utils/context";


function TradeHistory() {
    const [history, setHistory] = useState([]);
    const [isConnected, setIsConnected] = useState(false);

    const formatToEther = (amount) => {
        return ethers.utils.formatEther(amount); // Convert Wei to Ether
    };

    const sliceLongValue = (value, length = 10) => {
        return value.length > length ? `${value.slice(0, length)}...` : value;
    };

    const tokens = [
        { address: "0xD3a33C6fEa7F785DdC0915f6A76919C11AbdED45", symbol: "wanDOGE" },
        { address: "0x52f44783BdF480e88C0eD4cF341A933CAcfDBcaa", symbol: "wanDOT" },
        { address: "0x81862b7622CEd0DEfB652Addd4e0c110205B0040", symbol: "wanEOS" },
        { address: "0xE3aE74D1518A76715aB4C7BeDF1af73893cd435A", symbol: "wanETH" },
        { address: "0x3Db40923e0410E2D81d3A5e529B851A93313bb3f", symbol: "SOL" },
        { address: "0x9B6863f6Ab2047069aD1CD15fFf8C45Af637D67c", symbol: "wanSHUSHI" },
        { address: "0x73Eaa7431B11b1e7A7d5310DE470DE09883529DF", symbol: "wanUNI" },
        { address: "0xB333721251961337F67bbBCAED514f9F284CE8E8", symbol: "wanAVAX" },
        { address: "0x9DE0405064BEDd88399098b4fbb2f7fA462992E0", symbol: "BNB" },
        { address: "0x50c439B6d602297252505a6799d84eA5928bCFb6", symbol: "BTC" },
        { address: "0x18A39cDd1bFD592F40e4862728DF8879e84bBC91", symbol: "DAI" },
        { address: "0x52A9CEA01c4CBDd669883e41758B8eB8e8E2B34b", symbol: "wanUSDC" },
        { address: "0x11e77E27Af5539872efEd10abaA0b408cfd9fBBD", symbol: "wanUSDT" },
        { address: "0xB24999Cf67e4EACBF164BcE9138136F33589d969", symbol: "VOX" },
        { address: "0x924fd608bf30dB9B099927492FDA5997d7CFcb02", symbol: "WaspToken" },
        { address: "0xdabD997aE5E4799BE47d6E69D9431615CBa28f48", symbol: "WAN" },

    ];


    // Function to get the token symbol based on the address
    const getTokenSymbol = (address) => {
        const token = tokens.find((t) => t.address === address);
        return token ? token.symbol : "Unknown";
    };


    const fetchHistory = async () => {
        try {
            console.log("Fetching trade history...");
            const tradeHistory = await getTradeHistory();
            setHistory(tradeHistory);
            console.log("Trade history fetched:", tradeHistory);
        } catch (error) {
            console.error("Failed to fetch trade history:", error);
        }
    };

    // Fetch history on component mount and when isConnected changes
    useEffect(() => {
        const fetchData = async () => {
            console.log("fetching history");
            await fetchHistory();
        };

        if (isConnected) {
            fetchData();
        }
    }, [, isConnected]);



    useEffect(() => {
        const checkConnection = async () => {
            if (window.ethereum) {
                try {
                    const provider = new ethers.providers.Web3Provider(window.ethereum);
                    const accounts = await provider.send("eth_requestAccounts", []);
                    // console.log("Connected Accounts:", accounts);
                    // console.log("Accounts:", accounts);
                    if (accounts) setIsConnected(true); // If accounts are available, the user is connected.
                    // console.log("Connected accounts:", accounts);
                } catch (error) {
                    console.error("Error checking connection:", error);
                    setIsConnected(false);
                }
            } else {
                console.warn("MetaMask is not installed.");
                setIsConnected(false);
            }
        };

        checkConnection();

    }, []);

    return (
        <div className="p-4 m-2 border hidden lg:block border-gray-700 rounded-md shadow-md shadow-black">
            <h2 className="text-xl font-mono text-gray-100 font-bold mb-4">Trade History</h2>
            <table className="table-auto w-full border-collapse border border-gray-700">
                <thead className='bg-gray-800'>
                    <tr>
                        <th className="border border-slate-900 px-4 py-2 text-gray-400">User</th>
                        <th className="border border-slate-900 px-4 py-2 text-gray-400">From </th>
                        <th className="border border-slate-900 px-4 py-2 text-gray-400">To</th>
                    </tr>
                </thead>
                <tbody className="overflow-y-auto max-h-[150px] grid-rows-3">
                    {isConnected ? (
                        history && history.length > 0 ? (
                            [...(history || [])].filter(trade => trade && trade.user && trade.amountIn && trade.amountOut).reverse().map((trade, index) => (
                                <tr key={index}>
                                    <td className="border border-gray-700 px-4 py-2 text-gray-200 relative group">
                                        <span>
                                            {`${trade?.user?.slice(0, 10)}...`}
                                        </span>
                                        <span className="absolute hidden text-xs group-hover:block bg-gray-800 text-white px-2 py-1 z-10 left-0">
                                            {trade?.user}
                                        </span>
                                    </td>

                                    <td
                                        className="border text-sm border-gray-700 px-4 py-2 text-gray-200"
                                        title={`${trade?.amountIn ? formatToEther(trade?.amountIn) + " " + (getTokenSymbol(trade?.fromToken)) : "N/A"}`}
                                    >
                                        {trade?.amountIn
                                            ? sliceLongValue(formatToEther(trade?.amountIn), 10) +
                                            " " +
                                            (getTokenSymbol(trade?.fromToken))
                                            : "N/A"}
                                    </td>
                                    <td
                                        className="border text-sm border-gray-700 px-4 py-2 text-gray-200"
                                        title={`${trade?.amountOut ? formatToEther(trade?.amountOut) + " " + (getTokenSymbol(trade?.toToken)) : "N/A"}`}
                                    >
                                        {trade?.amountOut
                                            ? sliceLongValue(formatToEther(trade?.amountOut), 5) +
                                            " " +
                                            (getTokenSymbol(trade?.toToken))
                                            : "N/A"}
                                    </td>
                                </tr>
                            ))
                        ) : (
                            <tr>
                                <td className="p-3 text-center text-gray-600" colSpan="3">
                                    No trades found.
                                </td>
                            </tr>
                        )
                    ) : (
                        <tr>
                            <td className="p-3 text-center text-gray-600" colSpan="3">
                                Please connect to view your trade history.
                            </td>
                        </tr>
                    )}
                </tbody>

            </table>
        </div>
    )
}

export default TradeHistory
