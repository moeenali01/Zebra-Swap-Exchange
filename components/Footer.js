import React from "react";

import { Twitter, Facebook, Insta } from "./index";

const Footer = () => {
    const footMenu = ["Features", "Integrations", "Pricing", "Blog"];
    const footMenu2 = ["Terms of Service", "Privacy Policy"];
    return (
        <footer className="px-4 divide-y bg-[#1A1A1A] text-gray-100 bg-footer-pattern bg-cover bg-center">
            <div className="container flex flex-col lg:justify-between items-center justify-around py-10 lg:py-3 mx-auto space-y-8 lg:flex-row lg:space-y-0">
                <div className="lg:w-1/3">
                    <a rel="noopener noreferrer" href="#" className="flex justify-center space-x-3 lg:justify-start">
                        <img src="./img/logo-footer.png" alt="zebra" width={120} />
                        <span className="self-center text-2xl font-semibold text-gray-50"></span>

                    </a>
                </div>

                <div>
                    <ul className="items-stretch lg:justify-center  flex flex-row text-sm space-x-0   lg:space-x-3 lg:flex">
                        <li className="flex ">
                            <a rel="noopener noreferrer" href="/swap" className="flex items-center px-4 font-mono -mb-1 dark:border-transparent ">
                                Swap
                            </a>
                        </li>
                        <li className="flex">
                            <a rel="noopener noreferrer" href="/exchange" className="flex items-center px-4 font-mono -mb-1 dark:border-transparent  ">
                                Exchange
                            </a>
                        </li>
                        <li className="flex">
                            <a rel="noopener noreferrer" href="#" className="flex items-center px-4 font-mono -mb-1 dark:border-transparent  ">
                                Staking
                            </a>
                        </li>
                        <li className="flex">
                            <a rel="noopener noreferrer" href="#" className="flex items-center px-4 font-mono -mb-1 dark:border-transparent">
                                Application
                            </a>
                        </li>
                    </ul>
                </div>

                <div className="grid grid-cols-1 text-sm gap-x-3 gap-y-8  lg:w-1/3 sm:grid-cols-1 ">
                    {/* <div className="space-y-3 ">
                        <h3 className="tracki uppercase text-[#53D6FF]">Product</h3>
                        <ul className="space-y-1 font-mono text-gray-50">
                            {footMenu.map((menu, index) => (
                                <li key={index + 1}>
                                    <a rel="noopener noreferrer" href="#" >{menu}</a>
                                </li>
                            ))}
                        </ul>
                    </div> */}
                    {/* <div className="space-y-3 ">
                        <h3 className="tracki uppercase text-[#53D6FF]">Company</h3>
                        <ul className="space-y-1 font-mono text-gray-50">
                            {footMenu2.map((menu, index) => (
                                <li key={index + 1}>
                                    <a rel="noopener noreferrer" href="#" >{menu}</a>
                                </li>
                            ))}
                        </ul>
                    </div> */}
                    {/* <div className="space-y-3 ">
                        <h3 className=" uppercase text-[#53D6FF]">Developers</h3>
                        <ul className="space-y-1 font-mono  text-gray-50">
                            {["Public API", "Documentation", "Guides"].map((menu, index) => (
                                <li key={index + 1}>
                                    <a rel="noopener noreferrer" href="#" >{menu}</a>
                                </li>
                            ))}
                        </ul>
                    </div> */}



                    <div className="space-y-3 lg:text-right lg:pt-6 text-center">
                        <div className="uppercase text-[#53D6FF] ">Social Media</div>
                        <div className="flex lg:justify-end    font-mono space-x-3 text-gray-50">
                            <a href="https://www.facebook.com/people/Zebraswap/100091439475142/" title="Facebook" className="flex items-center p-1">
                                <Facebook />
                            </a>
                            <a href="https://x.com/Zebraswap_io?mx=2" title="Twitter" className="flex items-center p-1">
                                <Twitter />
                            </a>
                            <a href="https://www.instagram.com/zebraswap/" title="Instagram" className="flex items-center p-1">
                                <Insta />
                            </a>
                            <a href="https://www.linkedin.com/company/zebra_swap/" title="LinkedIn" className="flex items-center ">
                                <img src="./linkedin.png" alt="linkedin" width={30} />
                            </a>
                        </div>
                    </div>
                </div>
            </div>

            <div className=" py-6 text-sm text-center border-[#53D6FF] border-t-[3px]  text-gray-400">
                <p> Copyright 2023 DimoDex</p>
            </div>

        </footer>

    );
};

export default Footer;
