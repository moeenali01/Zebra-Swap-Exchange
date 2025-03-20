import React, { createContext, useEffect, useState } from 'react';

export const WebSocketContext = createContext();

const WebSocketProvider = ({ children }) => {
    const [data, setData] = useState({});
    const ws = new WebSocket("wss://stream.binance.com:9443/ws");

    const apiCall = {
        method: "SUBSCRIBE",
        params: [
            "btcusdt@ticker",
            "ethusdt@ticker",
            "xrpusdt@ticker",
            "trxusdt@ticker",
            "tusdusdt@ticker",
            "bnbusdt@ticker",
            "usdcusdt@ticker",
            "solusdt@ticker",
            "maticusdt@ticker",
            "dotusdt@ticker"
        ],
        id: 1,
    };

    useEffect(() => {
        ws.onopen = () => {
            ws.send(JSON.stringify(apiCall));
        };

        ws.onmessage = (event) => {
            const json = JSON.parse(event.data);
            setData((prevData) => ({
                ...prevData,
                [json.s]: json,
            }));
        };

        ws.onerror = (error) => {
            console.error("WebSocket error:", error);
        };

        return () => {
            ws.close();
        };
    }, []);

    return (
        <WebSocketContext.Provider value={data}>
            {children}
        </WebSocketContext.Provider>
    );
};

export default WebSocketProvider;
