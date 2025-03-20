import React, { useEffect } from "react";
import CoinsBlock from "./CoinsBlock"; // Ensure this component exists and is functional
import CoinTable from "./CoinTable"; // Ensure this component exists and is functional

function Charts() {
    useEffect(() => {
        document.title = "Zebra Price Tracker";
    }, []);

    return (
        <div className=" text-white min-h-screen p-6">
            <div className="grid gap-6">
                {/* CoinsBlock Section */}
                <div className="rounded-lg shadow-md p-6">
                    <CoinsBlock />
                </div>
                {/* CoinTable Section */}
                <div className=" rounded-lg shadow-md p-6">

                    <CoinTable />
                </div>
            </div>
        </div>
    );
}

export default Charts;
