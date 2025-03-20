import React, { useEffect, useRef, memo } from "react";

function TradingViewWidget({ width = "320", height = "280", symbol = "CRYPTO:WANUSD" }) {
    const containerRef = useRef(null);

    useEffect(() => {
        if (!containerRef.current) return;

        containerRef.current.innerHTML = "";

        const script = document.createElement("script");
        script.src =
            "https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js";
        script.type = "text/javascript";
        script.async = true;
        script.innerHTML = JSON.stringify({
            autosize: false,
            width,
            height,
            symbol: !symbol ? "CRYPTO:WANUSD" : symbol,
            interval: "D",
            timezone: "Etc/UTC",
            theme: "dark",
            style: "1",
            locale: "en",
            allow_symbol_change: true,
            calendar: false,
            support_host: "https://www.tradingview.com",
        });

        containerRef.current.appendChild(script);
    }, [width, height, symbol]);

    return (
        <div
            className="tradingview-widget-container"
            ref={containerRef}
            style={{ height, width }}
        >
            <div
                className="tradingview-widget-container__widget"
                style={{ height: "100%", width: "100%" }}
            ></div>
            <div className="tradingview-widget-copyright">
                <a
                    href="https://www.tradingview.com/"
                    rel="noopener nofollow"
                    target="_blank"
                >
                    <span className="blue-text">Track all markets on TradingView</span>
                </a>
            </div>
        </div>
    );
}

export default memo(TradingViewWidget);
