const axios = require('axios');
const chalk = require('chalk');
const Stellar = require('stellar-sdk');
const prompt = require('prompt-sync')({ sigint: true });
const config = require('../config.json');
const piLib = require('./piLib');
const CLI = require('clui');
const Spinner = CLI.Spinner;

async function check () {
    piLib.createBanner('Check Balance');

    const server = new Stellar.Server(config.server);

    const accountAddress = config.my_address || prompt(chalk.yellowBright('Account Address: '));

    const checkBalance = async (accountAddress) => {
        const account = await server.loadAccount(accountAddress);
        return {
            accountId: account.id,
            balances: account.balances.map(balance => ({
                asset: balance.asset_code,
                type: balance.asset_type,
                balance: balance.balance
            }))
        };
    };

    const checkReserve = async (accountAddress) => {
        const reqUrl = `${config.server}/accounts/${accountAddress}`;
        const res = await axios.get(reqUrl);
        return res.data.subentry_count;
    };

    const status = new Spinner('Checking balances, please wait...');
    status.start();

    try {
        const account = await checkBalance(accountAddress);
        status.stop();

        console.log('\n');
        console.log(chalk.yellowBright(`Account ID: ${account.accountId}\n`));
        account.balances.forEach((balance) => {
            console.log(chalk.yellowBright(`Asset: ${balance.type === "native" ? config.currency : balance.asset}`));
            console.log(chalk.yellowBright(`Type: ${balance.type}`));
            console.log(chalk.yellowBright(`Balance: ${balance.balance}`));
            console.log('\n');
        });

        const subentryCount = await checkReserve(accountAddress);
        const reserve = config.baseReserve * (2 + subentryCount);
        console.log(chalk.yellowBright(`Reserve: ${reserve}`));

        // Start real-time stream
        listenForUpdates(accountAddress, server);

    } catch (e) {
        status.stop();
        console.error('❌ Error:', e.message);
    }
}

function listenForUpdates(accountId, server) {
    console.log(`🔁 Listening for updates on Pi account: ${accountId}`);

    server.accounts()
        .accountId(accountId)
        .stream({
            onmessage: function (account) {
                const native = account.balances.find(b => b.asset_type === 'native');

                const totalBalance = parseFloat(native?.balance || '0.0000000');
                const lockedBalance = parseFloat(native?.locked_balance || '0.0000000');
                const availableBalance = (totalBalance - lockedBalance).toFixed(7);

                const lockedUntil = account?.locked_until;
                const pendingUntil = account?.pending_until;

                const lockedUntilDate = lockedUntil ? new Date(lockedUntil * 1000) : null;
                const pendingUntilDate = pendingUntil ? new Date(pendingUntil * 1000) : null;

                console.log('-----------------------------');
                console.log(`🪙 Total Balance      : ${totalBalance}`);
                console.log(`🔐 Locked Up Balance  : ${lockedBalance}`);
                console.log(`✅ Available Balance  : ${availableBalance}`);

                if (pendingUntilDate) {
                    console.log(`⏳ Pending Until      : ${pendingUntilDate.toLocaleString()}`);
                }

                if (lockedUntilDate) {
                    console.log(`🔓 Locked Until       : ${lockedUntilDate.toLocaleString()}`);
                } else {
                    console.log(`🔓 Locked Until       : Not Available`);
                }

                console.log(`⏱ Timestamp           : ${new Date().toLocaleString()}`);
                console.log('-----------------------------\n');
            },
            onerror: function (err) {
                console.error('❌ Stream Error:', err);
            }
        });
}

module.exports = check;
