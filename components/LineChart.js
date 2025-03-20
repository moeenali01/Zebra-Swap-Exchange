import React, { useEffect, useState } from "react";
import Chart from "react-google-charts";

function LineChart({ hisdata }) {
    const [data, setData] = useState([["Date", "Prices"]]);

    useEffect(() => {
        let dataCopy = [["Date", "Prices"]];
        if (hisdata?.prices) {
            hisdata.prices.forEach((price) => {

                dataCopy.push([new Date(price[0]), price[1]]);
            });
            setData(dataCopy);
        }
    }, [hisdata]);

    return (
        <Chart
            height="100%"
            chartType="LineChart"
            loader={<div className="text-white font-mono" >Loading Chart</div>}
            data={data}
            options={{
                title: "Price History",
                hAxis: { title: "Date" },
                vAxis: { title: "Price (USD)" },
                legend: "none",
            }}
        />
    );
}

export default LineChart;
