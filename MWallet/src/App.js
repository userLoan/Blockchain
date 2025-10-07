import React, { Component } from 'react';
import Web3 from 'web3';
import Container from './Components/Container';
import Nav from './Components/Nav';
import Description from './Components/Description';
import Mnemonic from './Items/Mnemonic.js';
const bip39 = require('bip39');
const hdkey = require('hdkey');
const ethUtil = require('ethereumjs-util');

class App extends Component {
    constructor() {
        super();
        this.appName = 'Merchant Wallet';
        this.getAccountTransactions = this.getAccountTransactions.bind(this);

        this.state = {
            acc: null,
            accounts: [],
            transactions: [],
            mnemonic: Mnemonic,
        };
    }

    // ==============================
    // 🔹 Lấy tất cả giao dịch của 1 account
    // ==============================
    getAccountTransactions = (accAddress) => {
        const startBlockNumber = 0;
        let app = this;
        let transactions = [];

        (async function main() {
            try {
                const endBlockNumber = await app.web3.eth.getBlockNumber();
                console.log(
                    `Searching transactions to ${accAddress} between blocks ${startBlockNumber} and ${endBlockNumber}`
                );

                for (let i = endBlockNumber; i >= 0; i--) {
                    const block = await app.web3.eth.getBlock(i, true);
                    if (block && block.transactions) {
                        block.transactions.forEach((tx) => {
                            if (accAddress === tx.to) {
                                const value = Number(tx.value) / 1e18;
                                const confirmations = endBlockNumber - tx.blockNumber;
                                const cflag = confirmations > 40 ? 'Confirmed' : 'Unconfirmed';

                                transactions.push({
                                    transactionIndex: tx.transactionIndex,
                                    hash: tx.hash,
                                    blockNumber: tx.blockNumber,
                                    from: tx.from,
                                    value,
                                    confirmations,
                                    cflag,
                                });
                            }
                        });
                    }
                }

                app.setState({ transactions, acc: accAddress });
                console.log('Transactions updated:', transactions.length);
            } catch (err) {
                console.error('Error fetching transactions:', err);
            }
        })();
    };

    // ==============================
    // 🔹 Khi component mount -> lấy danh sách địa chỉ
    // ==============================
    async componentDidMount() {
        let app = this;
        let accounts = [];
        let pathid = 100;

        try {
            // Kết nối Ganache
            this.web3 = new Web3(new Web3.providers.HttpProvider("http://127.0.0.1:7545"));
            const netId = await this.web3.eth.net.getId();
            console.log("Web3 connected to network:", netId);

            console.log("Mnemonic:", this.state.mnemonic);

            // Tạo seed và root key
            const seed = await bip39.mnemonicToSeed(this.state.mnemonic);
            const root = hdkey.fromMasterSeed(seed);

            // Duyệt qua 100 địa chỉ
            for (let i = 0; i <= pathid; i++) {
                const path = `m/44'/60'/0'/0/${i}`;
                const addrNode = root.derive(path);
                const pubKey = ethUtil.privateToPublic(addrNode._privateKey);
                const addr = ethUtil.publicToAddress(pubKey).toString('hex');
                const address = ethUtil.toChecksumAddress('0x' + addr);

                try {
                    const result = await this.web3.eth.getBalance(address);
                    const balance = Number(result) / 1e18;
                    if (balance > 0) {
                        accounts.push({ address, balance });
                        console.log(`Found account: ${address} | Balance: ${balance} ETH`);
                    }
                } catch (err) {
                    console.error("Error fetching balance:", err);
                }
            }

            this.setState({ accounts });
            console.log(`Total active accounts: ${accounts.length}`);
        } catch (err) {
            console.error("Web3 initialization failed:", err);
        }
    }

    // ==============================
    // 🔹 Render giao diện
    // ==============================
    render() {
        return (
            <div>
                <Nav appName={this.appName} />
                <Description acc={this.state.acc} />
                <Container
                    acc={this.state.acc}
                    accounts={this.state.accounts}
                    transactions={this.state.transactions}
                    getAccountTransactions={this.getAccountTransactions}
                />
            </div>
        );
    }
}

export default App;
