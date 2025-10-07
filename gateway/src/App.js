import React, { Component } from 'react';
import Web3 from 'web3';
import Nav from './Components/Nav';
import Description from './Components/Description';
import Container from './Components/Container';
import Shoes from './Items/all';

// =============== Helper: fetch có timeout ===================
function fetchWithTimeout(url, options, ms) {
  if (typeof ms !== 'number') ms = 10000; // mặc định 10s
  return Promise.race([
    fetch(url, options || {}),
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Timeout after ' + ms + 'ms')), ms)
    ),
  ]);
}

// =============== MAIN APP ===================================
class App extends Component {
  constructor() {
    super();
    this.appName = 'Sindbad Commerce';
    this.shoes = Shoes;

    this.closePayment = this.closePayment.bind(this);
    this.PaymentWait = this.PaymentWait.bind(this);
    this.resetApp = this.resetApp.bind(this);
    this.bCheck = this.bCheck.bind(this);
    this.startTimer = this.startTimer.bind(this);
    this.tick = this.tick.bind(this);

    this.state = {
      shoes: [],
      PaymentDetail: {},
      Conv: 300, // tỷ giá USD mặc định
      defaultGasPrice: null,
      defaultGasLimit: 200000,
      paymentf: false,
      mAddress: '0x',
      amount: 0,
      diff: 0,
      seconds: '00',
      minutes: '15',
      tflag: true,
      errorMsg: null,
    };
  }

  // =============== Lấy địa chỉ merchant và tỷ giá ===================
  newPayment = async (index) => {
    if (index == null || !this.state.shoes[index]) {
      this.setState({ errorMsg: 'Sản phẩm không hợp lệ.' });
      return;
    }

    try {
      // 1️⃣ Gọi API backend để lấy địa chỉ merchant
      const addrRes = await fetchWithTimeout(
        'http://127.0.0.1:5000/api/getMAddress',
        {},
        10000
      );
      if (!addrRes.ok)
        throw new Error(`API ${addrRes.status} ${addrRes.statusText}`);
      const addrJson = await addrRes.json();
      const mAddr = addrJson.MAddress || addrJson.mAddress || addrJson.address;

      if (!mAddr || !mAddr.startsWith('0x') || mAddr.length < 10) {
        throw new Error('Địa chỉ ví merchant không hợp lệ.');
      }

      // 2️⃣ Lấy tỷ giá ETH → USD
      const rateRes = await fetchWithTimeout(
        'https://min-api.cryptocompare.com/data/price?fsym=ETH&tsyms=USD',
        {},
        10000
      );
      if (!rateRes.ok)
        throw new Error(`Rate ${rateRes.status} ${rateRes.statusText}`);
      const rateJson = await rateRes.json();
      const conv = rateJson.USD || 300;

      // 3️⃣ Cập nhật state
      this.setState({
        PaymentDetail: this.state.shoes[index],
        mAddress: mAddr,
        Conv: conv,
        errorMsg: null,
      });
      console.log('✅ Fetched merchant address:', mAddr);
    } catch (err) {
      console.error('❌ newPayment failed:', err);
      this.setState({
        PaymentDetail: {},
        mAddress: '0x',
        errorMsg:
          err && err.message
            ? 'Không gọi được API: ' + err.message
            : 'Không gọi được API backend.',
      });
    }
  };

  // =============== Đóng giao dịch ===================
  closePayment() {
    clearInterval(this.intervalHandle);
    clearInterval(this.intervalBalance);

    this.setState({
      PaymentDetail: {},
      paymentf: false,
      mAddress: '0x',
      amount: 0,
      diff: 0,
      seconds: '00',
      minutes: '15',
      tflag: true,
      defaultGasPrice: null,
      defaultGasLimit: 200000,
      errorMsg: null,
    });
  }

  // =============== Bắt đầu chờ thanh toán ===================
  PaymentWait(mAddress, amount) {
    this.setState({
      paymentf: true,
      amount: amount,
      mAddress: mAddress,
    });
  }

  resetApp() {
    this.closePayment();
  }

  // =============== Lấy Gas Price ===================
  setGasPrice = (web3) => {
    web3.eth.getGasPrice((err, priceWei) => {
      if (!err) {
        this.setState({ defaultGasPrice: priceWei.toString() });
      } else {
        console.error('GasPrice error:', err);
      }
    });
  };

  // =============== Gửi giao dịch qua MetaMask ===================
  MMaskTransfer = (MRAddress, amount) => {
    const app = this;

    if (!window.ethereum) {
      this.setState({
        errorMsg: 'Không phát hiện ví MetaMask trên trình duyệt.',
      });
      return;
    }

    const ethereum = window.ethereum;
    const web3 = new Web3(ethereum);

    ethereum
      .request({ method: 'eth_requestAccounts' })
      .then((accounts) => {
        const account = accounts[0];
        web3.eth.defaultAccount = account;

        if (!app.state.defaultGasPrice) {
          app.setGasPrice(web3);
        }

        let valueWei = '0';
        try {
          valueWei = web3.utils.toWei(String(amount), 'ether');
        } catch (e) {
          app.setState({ errorMsg: 'Số tiền không hợp lệ.' });
          return;
        }

        const tx = {
          from: account,
          to: MRAddress,
          gas: app.state.defaultGasLimit,
          gasPrice: app.state.defaultGasPrice || undefined,
          value: valueWei,
        };

        web3.eth.sendTransaction(tx, (error, result) => {
          if (!error) {
            console.log('✅ Tx hash:', result);
            app.resetApp();
          } else {
            console.error('❌ Tx error:', error);
            app.setState({
              errorMsg:
                error && error.message
                  ? error.message
                  : 'Gửi giao dịch thất bại.',
            });
          }
        });
      })
      .catch((err) => {
        console.error('MetaMask request error:', err);
        app.setState({
          errorMsg: 'Không thể truy cập tài khoản MetaMask.',
        });
      });
  };

  // =============== Đồng hồ đếm lùi ===================
  tick() {
    let min = Math.floor(this.secondsRemaining / 60);
    let sec = this.secondsRemaining - min * 60;

    this.setState({
      minutes: min < 10 ? '0' + min : String(min),
      seconds: sec < 10 ? '0' + sec : String(sec),
    });

    if (min === 0 && sec === 0) {
      clearInterval(this.intervalHandle);
      clearInterval(this.intervalBalance);
    }

    this.secondsRemaining = Math.max(0, this.secondsRemaining - 1);
  }

  // =============== Kiểm tra số dư ví merchant ===================
  bCheck() {
    let app = this;
    let amount = this.state.amount;
    let mAddr = this.state.mAddress;

    // ✅ Bỏ qua nếu chưa có địa chỉ hợp lệ
    if (!mAddr || !/^0x[a-fA-F0-9]{40}$/.test(mAddr)) {
      console.warn('⚠️ mAddress invalid, skipping balance check:', mAddr);
      return;
    }

    try {
      this.web3 = new Web3(
        new Web3.providers.HttpProvider('http://127.0.0.1:7545')
      );

      this.web3.eth.getBalance(mAddr, function (error, resultWei) {
        if (!error) {
          const diffEth = Number(app.web3.utils.fromWei(resultWei, 'ether'));
          if (diffEth >= amount) {
            clearInterval(app.intervalHandle);
            clearInterval(app.intervalBalance);
          }
          app.setState({ diff: diffEth });
        } else {
          console.error('❌ Error checking balance:', error);
        }
      });
    } catch (err) {
      console.error('❌ Web3 error in bCheck():', err);
    }
  }

  // =============== Bắt đầu bộ đếm & kiểm tra thanh toán ===================
  startTimer() {
    if (this.state.tflag === true) {
      const time = parseInt(this.state.minutes, 10) || 0;
      this.secondsRemaining = time * 60;

      this.intervalHandle = setInterval(this.tick, 1000);
      this.intervalBalance = setInterval(this.bCheck, 10000);

      this.setState({ tflag: false });
    }
  }

  // =============== Lúc khởi chạy app ===================
  componentDidMount() {
    const shoes = Shoes.map(({ logo, price, image, name }) => ({
      logo,
      price,
      image,
      name,
    }));
    this.setState({ shoes });
  }

  // =============== RENDER UI ===================
  render() {
    return (
      <div>
        <Nav appName={this.appName} />
        <Description />

        {this.state.errorMsg && (
          <div className="notification is-danger" style={{ margin: '12px' }}>
            {this.state.errorMsg}
          </div>
        )}

        <Container
          shoes={this.state.shoes}
          newPayment={this.newPayment}
          closePayment={this.closePayment}
          PaymentDetail={this.state.PaymentDetail}
          mAddress={this.state.mAddress}
          amount={this.state.amount}
          diff={this.state.diff}
          paymentf={this.state.paymentf}
          Conv={this.state.Conv}
          MMaskTransfer={this.MMaskTransfer}
          PaymentWait={this.PaymentWait}
          startTimer={this.startTimer}
          tick={this.tick}
          defaultGasPrice={this.state.defaultGasPrice}
          defaultGasLimit={this.state.defaultGasLimit}
          minutes={this.state.minutes}
          seconds={this.state.seconds}
        />
      </div>
    );
  }
}

export default App;
