import React, { useEffect, useState } from 'react';

const CoinsBlock = () => {
  const [databtc, setDatabtc] = useState({});
  const [dataeth, setDataeth] = useState({});
  const [dataxrp, setDataxrp] = useState({});
  const [datatron, setDatatron] = useState({});

  const ws = new WebSocket("wss://stream.binance.com:9443/ws");
  const apiCall = {
    method: "SUBSCRIBE",
    params: [
      "btcusdt@ticker",
      "ethusdt@ticker",
      "xrpusdt@ticker",
      "trxusdt@ticker",
    ],
    id: 1,
  };

  const socket = () => {
    ws.onopen = () => {
      ws.send(JSON.stringify(apiCall));
    };

    ws.onmessage = (event) => {
      const json = JSON.parse(event.data);
      try {
        if (json.s === "ETHUSDT") {
          setDataeth(json);
        } else if (json.s === "XRPUSDT") {
          setDataxrp(json);
        } else if (json.s === "BTCUSDT") {
          setDatabtc(json);
        } else if (json.s === "TRXUSDT") {
          setDatatron(json);
        }
      } catch (err) {
        console.error(err);
      }
    };
  };

  useEffect(() => {
    socket();
    return () => ws.close();
  }, []);

  const renderCoinBlock = (image, name, data) => (
    <div className="flex flex-col bg-white rounded-lg border z-50  border-gray-300 p-4 space-y-4 shadow-md">
      <div className="flex items-center">
        <img className="w-10 h-10" src={image} alt={`${name} logo`} />
        <div className="ml-4">
          <p className="text-gray-900 font-mono text-lg font-semibold">{name}</p>
          <p className="text-green-400 text-sm font-medium">
            ${parseFloat(data.a) ? parseFloat(data.a).toFixed(2) : "0.00"}
          </p>
        </div>
      </div>
      <div className="flex items-center justify-between">
        <img
          className="h-6"
          src={data.P > 0 ? "/img/graph-img.png" : "/img/Vector1.png"}
          alt="graph"
        />
        <p
          className={`text-sm font-semibold ${data.P > 0 ? "text-green-400" : "text-red-400"
            }`}
        >
          {data.P > 0 ? "+" : ""}{parseFloat(data.P) ? parseFloat(data.P).toFixed(2) : "0.00"}%
        </p>
      </div>
    </div>
  );

  return (
    <div className=" p-6 lg:p-8 lg:pb-0">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {renderCoinBlock("/img/coin-4-1.png", "Bitcoin", databtc)}
        {renderCoinBlock("/img/coin-4-2.png", "Ethereum", dataeth)}
        {renderCoinBlock("/img/coin-4-3.png", "XRP", dataxrp)}
        {renderCoinBlock("/img/usdc.svg.png", "TRON", datatron)}
      </div>
    </div>
  );
};

export default CoinsBlock;
