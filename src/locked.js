const StellarSdk = require('stellar-sdk');

// Set up Pi Network Horizon server
const server = new StellarSdk.Server('https://api.mainnet.minepi.com');

// Replace with your Pi account public key
const accountId = 'GDBCMMQETUOSMAXG242U55B4YCNI5QKXN6QWWBSUVRFP27TLD7Z5XOFP'; // <-- Put your real G... key here

console.log(`🔁 Listening for updates on Pi account: ${accountId}`);

server.accounts()
  .accountId(accountId)
  .stream({
    onmessage: function (account) {
      const native = account.balances.find(b => b.asset_type === 'native');
      if (native) {
        console.log('-----------------------------');
        console.log(`🪙 Total Balance: ${native.balance}`);
        console.log(`🔒 Locked Balance: ${native.locked_balance || '0.0000000'}`);
        console.log(`⏱ Timestamp: ${new Date().toLocaleString()}`);
        console.log('-----------------------------\n');
      } else {
        console.log('⚠️ No native balance found.');
      }
    },
    onerror: function (err) {
      console.error('❌ Stream Error:', err);
    }
  });
// Note: Replace