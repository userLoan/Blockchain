module.exports = {
  networks: {
    ganache: {
      host: "127.0.0.1",   // địa chỉ Ganache GUI
      port: 7545,          // port Ganache GUI (hoặc 8545 nếu bạn chỉnh)
      network_id: "*",     // chấp nhận mọi network id (thường Ganache GUI là 5777)
    },
  },

  compilers: {
    solc: {
      version: "0.8.21",
      settings: {
        evmVersion: "paris", // ép compile theo EVM Paris (The Merge)
        optimizer: {
          enabled: true,
          runs: 200,
        },
      },
    },
  },
};
