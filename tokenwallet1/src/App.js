import React, { Component } from 'react';
import Web3 from 'web3';
import Tokens20 from './tokens/all20';
import Tokens721 from './tokens/all721';
import Nav from './Components/Nav';
import Description from './Components/Description';
import Container from './Components/Container';
import InstallMetamask from './Components/InstallMetamask';

/** ----------------------------------------------
 *  Helpers: BigInt-safe amount conversions
 *  ---------------------------------------------- */
// Format on-chain integer (bigint-like) to decimal string by decimals
function formatUnits(value, decimals) {
  const big = typeof value === 'bigint' ? value : BigInt(value);
  const d = Number(decimals || 0);
  if (d === 0) return big.toString();
  const base = 10n ** BigInt(d);
  const whole = big / base;
  const frac = big % base;
  const fracStrRaw = frac.toString().padStart(d, '0');
  const fracStr = fracStrRaw.replace(/0+$/, '');
  return fracStr ? `${whole.toString()}.${fracStr}` : whole.toString();
}

// Parse human input ("1.234") to on-chain integer string according to decimals
function parseUnits(amountStr, decimals) {
  const d = Number(decimals || 0);
  const s = String(amountStr ?? '').trim();
  if (!s) return '0';
  if (d === 0) return BigInt(s).toString();
  const [wholeStr, fracStr = ''] = s.split('.');
  const whole = BigInt(wholeStr || '0');
  const base = 10n ** BigInt(d);
  const fracPadded = (fracStr + '0'.repeat(d)).slice(0, d);
  const frac = BigInt(fracPadded || '0');
  return (whole * base + frac).toString();
}

// Map chainId -> readable network name (includes 5777)
function networkNameFromChainId(chainIdIn) {
  const id = typeof chainIdIn === 'bigint' ? Number(chainIdIn) : Number(chainIdIn);
  switch (id) {
    case 1: return 'Ethereum Mainnet';
    case 11155111: return 'Sepolia';
    case 5: return 'Goerli (legacy)';
    case 56: return 'BNB Smart Chain';
    case 137: return 'Polygon';
    case 10: return 'Optimism';
    case 42161: return 'Arbitrum One';
    case 8453: return 'Base';
    case 31337: return 'Hardhat (31337)';
    case 1337: return 'Local (1337)';
    case 5777: return 'Ganache (5777)';
    default: return `Chain ${id}`;
  }
}

class App extends Component {
  constructor() {
    super();

    this.tokens20 = Tokens20;
    this.tokens721 = Tokens721;
    this.appName = 'TokenWallet';
    this.isWeb3 = true;

    this.newTransfer20 = this.newTransfer20.bind(this);
    this.newTransfer721 = this.newTransfer721.bind(this);
    this.newMint20 = this.newMint20.bind(this);
    this.newMint721 = this.newMint721.bind(this);
    this.newApprove20 = this.newApprove20.bind(this);
    this.newApprove721 = this.newApprove721.bind(this);
    this.closeTransfer = this.closeTransfer.bind(this);
    this.onInputChangeUpdateField = this.onInputChangeUpdateField.bind(this);

    this.state = {
      inProgress: false,
      tx20: null,
      tx721: null,
      network: 'Checking...',
      account: null,
      tokens20: [],
      tokens721: [],
      transferDetail20: {},
      transferDetail721: {},
      mintDetail20: {},
      mintDetail721: {},
      approveDetail20: {},
      approveDetail721: {},
      fields: {
        receiver: '',
        amount: '',
        metadata: '',
        tokenId: '',
        gasPrice: '',
        gasLimit: '',
      },
      defaultGasPrice: null,
      defaultGasLimit: 200000,
    };
  }

  /** ---------------------- Network utils ---------------------- */
  setNetwork = async () => {
    try {
      if (window.ethereum?.request) {
        const hex = await window.ethereum.request({ method: 'eth_chainId' });
        const id = parseInt(hex, 16);
        this.setState({ network: networkNameFromChainId(id) });
        return;
      }
      if (this.web3?.eth?.getChainId) {
        const id = await this.web3.eth.getChainId();
        this.setState({ network: networkNameFromChainId(id) });
        return;
      }
      this.setState({ network: 'Unknown' });
    } catch (e) {
      console.error('setNetwork error', e);
      this.setState({ network: 'Unknown' });
    }
  };

  setGasPrice = async () => {
    try {
      const price = await this.web3.eth.getGasPrice(); // may be bigint-like
      const weiStr = (typeof price === 'bigint' ? price.toString() : String(price));
      const gwei = this.web3.utils.fromWei(weiStr, 'gwei');
      this.setState({ defaultGasPrice: gwei });
    } catch (e) {
      console.warn('getGasPrice failed', e);
    }
  };

  /** ----------------------- UI actions ------------------------ */
  newTransfer20 = (index) => {
    this.setState({ transferDetail20: this.state.tokens20[index] });
  };
  newTransfer721 = (index) => {
    this.setState({ transferDetail721: this.state.tokens721[index] });
  };
  newMint20 = (index) => {
    this.setState({ mintDetail20: this.state.tokens20[index] });
  };
  newMint721 = (index) => {
    this.setState({ mintDetail721: this.state.tokens721[index] });
  };
  newApprove20 = (index) => {
    this.setState({ approveDetail20: this.state.tokens20[index] });
  };
  newApprove721 = (index) => {
    this.setState({ approveDetail721: this.state.tokens721[index] });
  };

  closeTransfer = () => {
    this.setState({
      transferDetail20: {},
      transferDetail721: {},
      mintDetail20: {},
      mintDetail721: {},
      approveDetail20: {},
      approveDetail721: {},
      fields: { receiver: '', amount: '', metadata: '', tokenId: '', gasPrice: '', gasLimit: '' },
    });
  };

  resetApp = () => {
    this.setState({
      transferDetail20: {},
      transferDetail721: {},
      mintDetail20: {},
      mintDetail721: {},
      approveDetail20: {},
      approveDetail721: {},
      fields: { receiver: '', amount: '', metadata: '', tokenId: '', gasPrice: '', gasLimit: '' },
    });
  };

  onInputChangeUpdateField = (name, value) => {
    this.setState((prev) => ({ fields: { ...prev.fields, [name]: value } }));
  };

  /** ------------------- On-chain actions --------------------- */
  Transfer = async () => {
    try {
      this.setState({ inProgress: true });
      const from = this.state.account;
      const receiver = String(this.state.fields.receiver || '').trim();

      if (this.state.fields.metadata) {
        // ERC-721
        const contract = new this.web3.eth.Contract(
          this.state.transferDetail721.abi,
          this.state.transferDetail721.address
        );
        const tokenIdStr = BigInt(this.state.fields.tokenId).toString();
        const metadata = String(this.state.fields.metadata);
        const response = await contract.methods
          .transferNFT(from, receiver, tokenIdStr, metadata)
          .send({ from });
        this.resetApp();
        this.setState({ tx721: response?.transactionHash || response, inProgress: false });
      } else {
        // ERC-20
        const contract = new this.web3.eth.Contract(
          this.state.transferDetail20.abi,
          this.state.transferDetail20.address
        );
        const decimals = this.state.transferDetail20.decimal;
        const amount = parseUnits(this.state.fields.amount, decimals);
        const response = await contract.methods.transfer(receiver, amount).send({ from });
        this.resetApp();
        this.setState({ tx20: response?.transactionHash || response, inProgress: false });
      }
    } catch (err) {
      console.error('Transfer error', err);
      this.setState({ inProgress: false });
    }
  };

  Mint = async () => {
    try {
      this.setState({ inProgress: true });
      const from = this.state.account;
      const receiver = String(this.state.fields.receiver || '').trim();

      if (this.state.fields.metadata) {
        // ERC-721
        const contract = new this.web3.eth.Contract(
          this.state.mintDetail721.abi,
          this.state.mintDetail721.address
        );
        const metadata = String(this.state.fields.metadata);
        const response = await contract.methods.createNFT(receiver, metadata).send({ from });
        this.resetApp();
        this.setState({ tx721: response?.transactionHash || response, inProgress: false });
      } else {
        // ERC-20
        const contract = new this.web3.eth.Contract(
          this.state.mintDetail20.abi,
          this.state.mintDetail20.address
        );
        const decimals = this.state.mintDetail20.decimal;
        const amount = parseUnits(this.state.fields.amount, decimals);
        const response = await contract.methods.mint(receiver, amount).send({ from });
        this.resetApp();
        this.setState({ tx20: response?.transactionHash || response, inProgress: false });
      }
    } catch (err) {
      console.error('Mint error', err);
      this.setState({ inProgress: false });
    }
  };

  Approve = async () => {
    try {
      this.setState({ inProgress: true });
      const from = this.state.account;
      const receiver = String(this.state.fields.receiver || '').trim();

      if (this.state.approveDetail20?.abi) {
        // ERC-20 approve(spender, amount)
        const contract = new this.web3.eth.Contract(
          this.state.approveDetail20.abi,
          this.state.approveDetail20.address
        );
        const decimals = this.state.approveDetail20.decimal;
        const amount = parseUnits(this.state.fields.amount, decimals);
        const response = await contract.methods.approve(receiver, amount).send({ from });
        this.resetApp();
        this.setState({ tx20: response?.transactionHash || response, inProgress: false });
      } else {
        // ERC-721 approve(to, tokenId)
        const contract = new this.web3.eth.Contract(
          this.state.approveDetail721.abi,
          this.state.approveDetail721.address
        );
        const tokenIdStr = BigInt(this.state.fields.tokenId).toString();
        const response = await contract.methods.approve(receiver, tokenIdStr).send({ from });
        this.resetApp();
        this.setState({ tx721: response?.transactionHash || response, inProgress: false });
      }
    } catch (err) {
      console.error('Approve error', err);
      this.setState({ inProgress: false });
    }
  };

  /** ---------------------- Lifecycle ------------------------- */
  async componentDidMount() {
    if (!window.ethereum) {
      this.isWeb3 = false;
      this.setState({ network: 'No provider' });
      return;
    }

    const ethereum = window.ethereum;
    this.web3 = new Web3(ethereum);

    try {
      const accounts = await ethereum.request({ method: 'eth_requestAccounts' });
      const account = accounts?.[0] || null;
      this.setState({ account });

      await this.setNetwork();
      await this.setGasPrice();

      // Listeners for runtime changes
      ethereum.on('chainChanged', async () => {
        await this.setNetwork();
        // Optionally, reload balances/tokens
      });
      ethereum.on('accountsChanged', async (accs) => {
        const nextAcc = accs?.[0] || null;
        this.setState({ account: nextAcc, tokens20: [], tokens721: [] });
        // Optionally, reload balances/tokens for new account
      });

      // -------- Load ERC-20 tokens balances --------
      for (const token of Tokens20) {
        try {
          const erc20Token = new this.web3.eth.Contract(token.abi, token.address);
          const raw = await erc20Token.methods.balanceOf(account).call();
          const rawBig = typeof raw === 'bigint' ? raw : BigInt(raw);
          if (rawBig > 0n) {
            const balanceStr = formatUnits(rawBig, token.decimal);
            const balanceNum = Number(balanceStr);
            const { name, symbol, icon, abi, address, decimal } = token;
            this.setState((prev) => ({
              tokens20: prev.tokens20.concat([{ decimal, balance: balanceNum, balanceStr, name, symbol, icon, abi, address }])
            }));
          }
        } catch (e) {
          console.warn('ERC20 load failed for', token?.symbol, e);
        }
      }

      // -------- Load ERC-721 tokens (example: MDTrack -> tokenURI) --------
      for (const token721 of Tokens721) {
        try {
          const erc721Token = new this.web3.eth.Contract(token721.abi, token721.address);
          const tokenIdResp = await erc721Token.methods.MDTrack(account).call();
          const tokenIdBig = typeof tokenIdResp === 'bigint' ? tokenIdResp : BigInt(tokenIdResp);
          if (tokenIdBig > 0n) {
            const tokenIdStr = tokenIdBig.toString();
            const metadata = await erc721Token.methods.tokenURI(tokenIdStr).call();
            const { name, symbol, icon, abi, address } = token721;
            this.setState((prev) => ({
              tokens721: prev.tokens721.concat([{ name, symbol, tokenid: tokenIdStr, icon, abi, address, metadata }])
            }));
          }
        } catch (e) {
          // If contract doesn't support MDTrack, just skip
          console.warn('ERC721 load failed for', token721?.symbol, e);
        }
      }
    } catch (err) {
      console.error('Init web3 error', err);
      this.setState({ network: 'Permission denied' });
    }
  }

  /** ------------------------- Render ------------------------- */
  render() {
    if (!this.isWeb3) {
      return <InstallMetamask />;
    }

    return (
      <div>
        <Nav appName={this.appName} network={this.state.network} />
        <Description />
        <Container
          onInputChangeUpdateField={this.onInputChangeUpdateField}
          transferDetail20={this.state.transferDetail20}
          transferDetail721={this.state.transferDetail721}
          mintDetail20={this.state.mintDetail20}
          mintDetail721={this.state.mintDetail721}
          approveDetail20={this.state.approveDetail20}
          approveDetail721={this.state.approveDetail721}
          closeTransfer={this.closeTransfer}
          newTransfer20={this.newTransfer20}
          newTransfer721={this.newTransfer721}
          newApprove20={this.newApprove20}
          newApprove721={this.newApprove721}
          newMint20={this.newMint20}
          newMint721={this.newMint721}
          Transfer={this.Transfer}
          Mint={this.Mint}
          Approve={this.Approve}
          account={this.state.account}
          defaultGasPrice={this.state.defaultGasPrice}
          defaultGasLimit={this.state.defaultGasLimit}
          tx20={this.state.tx20}
          tx721={this.state.tx721}
          inProgress={this.state.inProgress}
          fields={this.state.fields}
          tokens20={this.state.tokens20}
          tokens721={this.state.tokens721}
        />
      </div>
    );
  }
}

export default App;
