import React, { useEffect, useState } from 'react';
import Image from 'next/image'; // Using Next.js Image component for better optimization

import graphimg from '../public/img/graph-img.png';
import redgraph from '../public/img/Vector1.png';

function createData(coinimg, coinname, price, chart, change, volume) {
    return { coinimg, coinname, price, chart, change, volume };
}

const CoinTable = () => {
    const [tabIndex, setTabIndex] = useState(0);
    const [datatusd, setDatatusd] = useState({});
    const [databnb, setDatabnb] = useState({});
    const [datausdc, setDatausdc] = useState({});
    const [datasol, setDatasol] = useState({});
    const [datamatic, setDatamatic] = useState({});
    const [datadot, setDatadot] = useState({});

    const ws = new WebSocket("wss://stream.binance.com:9443/ws");
    const apiCall = {
        method: "SUBSCRIBE",
        params: [
            "tusdusdt@ticker",
            "bnbusdt@ticker",
            "usdcusdt@ticker",
            "solusdt@ticker",
            "maticusdt@ticker",
            "dotusdt@ticker"
        ],
        id: 1,
    };

    const socket = () => {
        ws.onopen = () => ws.send(JSON.stringify(apiCall));

        ws.onmessage = (event) => {
            const json = JSON.parse(event.data);
            try {
                switch (json.s) {
                    case "TUSDUSDT":
                        setDatatusd(json);
                        break;
                    case "BNBUSDT":
                        setDatabnb(json);
                        break;
                    case "USDCUSDT":
                        setDatausdc(json);
                        break;
                    case "SOLUSDT":
                        setDatasol(json);
                        break;
                    case "MATICUSDT":
                        setDatamatic(json);
                        break;
                    case "DOTUSDT":
                        setDatadot(json);
                        break;
                    default:
                        break;
                }
            } catch (err) {
                console.error(err);
            }
        };
    };

    const rows = [
        createData("/img/coins-1.png", 'Tether', datatusd?.a, graphimg, datatusd?.p, parseFloat(datatusd?.v)),
        createData("/img/coins-2.png", 'BNB', databnb?.a, graphimg, databnb?.p, parseFloat(databnb?.v)),
        createData("/img/coins-3.png", 'USDCoin', datausdc?.a, graphimg, datausdc?.p, parseFloat(datausdc?.v)),
        createData("/img/coins-4.png", 'Sol', datasol?.a, graphimg, datasol?.p, parseFloat(datasol?.v)),
        createData("/img/coins-5.png", 'Polygon', datamatic?.a, graphimg, datamatic?.p, parseFloat(datamatic?.v)),
        createData("/img/coins-6.png", 'Polkadot', datadot?.a, graphimg, datadot?.p, parseFloat(datadot?.v)),
    ];

    useEffect(() => {
        socket();
        return () => ws.close();
    }, []);

    return (
        <div className="flex flex-col items-center shadow-lg border-2 border-gray-200 border- rounded-lg font-mono">
            <div className="w-full p-6 bg-white rounded-lg">
                {tabIndex === 0 && (
                    <div className="overflow-x-auto">
                        <table className="w-full max-w-full table-auto text-left">
                            <thead>
                                <tr className="bg-gray-200 text-gray-800">
                                    <th className="px-4 py-3">Name</th>
                                    <th className="px-4 py-3">Price</th>
                                    <th className="px-4 py-3">Chart</th>
                                    <th className="px-4 py-3">Change</th>
                                    <th className="px-4 py-3">Volume (24h)</th>
                                </tr>
                            </thead>
                            <tbody>
                                {rows.map((row, index) => (
                                    <tr
                                        key={index}
                                        className="border-b hover:bg-gray-50 transition"
                                    >
                                        <td className="px-4 py-3 flex items-center space-x-3">
                                            <Image
                                                src={row.coinimg}
                                                alt={`${row.coinname}-img`}
                                                width={20}
                                                height={20}
                                            />
                                            <span className="text-gray-800">{row.coinname}</span>
                                        </td>
                                        <td className="px-4 py-3 text-gray-800">
                                            ${row.price || '0.00'}
                                        </td>
                                        <td className="px-4 py-3">
                                            <Image
                                                src={row.change >= 0 ? row.chart : redgraph}
                                                alt="chart"
                                                width={30}
                                                height={20}
                                            />
                                        </td>
                                        <td
                                            className={`px-4 py-3 ${row.change >= 0
                                                ? 'text-green-500'
                                                : 'text-red-500'
                                                }`}
                                        >
                                            {row.change || 0}%
                                        </td>
                                        <td className="px-4 py-3 text-gray-800">
                                            {row.volume || '0'}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
};

export default CoinTable;
