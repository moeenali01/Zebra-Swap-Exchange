import React, { useState, useEffect } from "react";

import { Footer, Header } from "../components/index";
import SwapSection from "../components/SwapSection";



const tokens = () => {
    return (
        <div className="bg-[#1a1a1a]">
            <Header />
            <SwapSection />
            <Footer />
        </div>

    );
};

export default tokens;

