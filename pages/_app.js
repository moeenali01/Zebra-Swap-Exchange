import "../styles/globals.css";

import { Web3Modal } from "../components/web3Modal";


function MyApp({ Component, pageProps }) {
  return (
    <Web3Modal>
      <Component {...pageProps} />
    </Web3Modal>

  );
}

export default MyApp;