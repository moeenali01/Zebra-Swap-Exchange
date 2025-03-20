import React, { useEffect, useState } from "react";
import { Dropdown } from "@nextui-org/react";
import Image from "next/image";

import {
  COIN_1,
  COIN_2,
  COIN_3,
  COIN_4,
  COIN_5,
  COIN_6,
  COIN_7,
  COIN_8,
  COIN_9,
  COIN_10,
  COIN_11,
  COIN_12,
  COIN_13,
  COIN_14,
  COIN_15,
  DEFAULT_VALUE,
  WAN,
} from "../utils/saleToken";


const Selector = ({ defaultValue, ignoreValue, setToken, id }) => {
  const menu = [
    { key: WAN, name: WAN, img: "/images/wan.png" },
    { key: COIN_1, name: COIN_1, img: "/images/doge.png" },
    { key: COIN_2, name: COIN_2, img: "/images/dot.png" },
    { key: COIN_3, name: COIN_3, img: "/images/eos.png" },
    { key: COIN_4, name: COIN_4, img: "/images/eth.png" },
    { key: COIN_5, name: COIN_5, img: "/images/sol.png" },
    { key: COIN_6, name: COIN_6, img: "/images/sushi.png" },
    { key: COIN_7, name: COIN_7, img: "/images/uni.png" },
    { key: COIN_8, name: COIN_8, img: "/images/avax.png" },
    { key: COIN_9, name: COIN_9, img: "/images/bnb.png" },
    { key: COIN_10, name: COIN_10, img: "/images/btc.png" },
    { key: COIN_11, name: COIN_11, img: "/images/dai.png" },
    { key: COIN_12, name: COIN_12, img: "/images/usdc.png" },
    { key: COIN_13, name: COIN_13, img: "/images/usdt.png" },
    { key: COIN_14, name: COIN_14, img: "/images/vox.png" },
    { key: COIN_15, name: COIN_15, img: "/images/wasp.png" },
  ];

  const [selectedItem, setSelectedItem] = useState();
  const [menuItems, setMenuItems] = useState(getFilteredItems(ignoreValue));

  function getFilteredItems(ignoreValue) {
    return menu.filter(item => item["key"] !== ignoreValue);
  }

  useEffect(() => {
    setSelectedItem(defaultValue);
  }, [defaultValue])

  useEffect(() => {
    setMenuItems(getFilteredItems(ignoreValue));
  }, [ignoreValue]);

  return (
    <Dropdown >
      <Dropdown.Button css={{ backgroundColor: selectedItem === DEFAULT_VALUE ? "#53D6FF" : "#2c2f36" }}>{selectedItem}</Dropdown.Button>
      <Dropdown.Menu
        aria-label="Dynamic Actions"
        items={menuItems}
        onAction={(key) => { setSelectedItem(key); setToken(key); }}
      >
        {(item) => (
          <Dropdown.Item
            aria-label={id}
            key={item.key}
            color={item.key === "delete" ? "error" : "default"}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <Image src={item.img} alt={item.name} width={24} height={24} />
              {item.name}
            </div>
          </Dropdown.Item>
        )}
      </Dropdown.Menu>
    </Dropdown>
  );
};

export default Selector;
