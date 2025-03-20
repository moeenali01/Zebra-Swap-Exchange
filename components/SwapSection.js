import React from "react";


import { SwapComponent } from "./index";

const SwapSection = () => {
    return (
        <section className="text-gray-100 bg-[#1A1A1A]">
            <div className="lg:ml-28 p-5 mt-8 max-sm:ml-0 flex flex-col   h-auto lg:h-screen mx-auto sm:py-12 lg:py-12 lg:flex-row lg:justify-between">
                <div className="flex flex-col lg:mb-0 justify-center pb-28   text-center rounded-sm lg:max-w-md xl:max-w-lg lg:text-left">
                    <h1 className="text-5xl font-bold font-sans leadi lg:text-6xl"> SWAP WITH </h1>
                    <h3 className="text-white font-sans text-6xl lg:text-8xl lg:pt-0 pt-3">Zebra</h3>

                    <p className="mt-6 mb-8 text-gray-300 text-lg font-mono sm:mb-12 ">Swap and save: Get the best exchange rates with Zebra's Swap feature</p>
                    <div className="flex flex-col space-y-4 sm:items-center sm:flex-row sm:space-y-0 sm:space-x-4 lg:justify-start">

                        <a
                            rel="noopener noreferrer"
                            href="#"
                            className="px-8 py-3 text-lg font-mono font-semibold border rounded border-gray-100">
                            SWAP ON WANCHAIN
                        </a>
                    </div>
                </div>
                <div className="flex items-center justify-center lg:pr-20 mb-16   p-0  mt-3 lg:mt-9  h-72 sm:h-80 lg:h-96 xl:h-112 2xl:h-128">
                    <SwapComponent />

                </div>
            </div>
        </section>
    );
};

export default SwapSection;
