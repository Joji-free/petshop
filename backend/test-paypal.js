// Quick test script to validate PayPal Client ID & Secret from .env
// Usage: node test-paypal.js

try { require('dotenv').config(); } catch(e) { /* ignore */ }
const axios = require('axios');

const client = process.env.PAYPAL_CLIENT_ID || '';
const secret = process.env.PAYPAL_CLIENT_SECRET || '';
const env = process.env.PAYPAL_ENV === 'live' ? 'https://api-m.paypal.com' : 'https://api-m.sandbox.paypal.com';

async function run() {
  console.log('Using PAYPAL_ENV=', process.env.PAYPAL_ENV || 'sandbox');
  console.log('ClientId prefix:', client ? client.substring(0,10) + '...' : '(missing)');
  console.log('Secret length:', secret ? secret.length : 0);
  if (!client || !secret) {
    console.error('Client ID or Secret missing in .env');
    process.exit(1);
  }

  const auth = Buffer.from(`${client}:${secret}`).toString('base64');
  try {
    const url = `${env}/v1/oauth2/token`;
    console.log('Requesting token from', url);
    const resp = await axios.post(url, 'grant_type=client_credentials', {
      headers: {
        Authorization: `Basic ${auth}`,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      timeout: 10000
    });
    console.log('OK. Response:');
    console.log(JSON.stringify(resp.data, null, 2));
  } catch (err) {
    if (err.response && err.response.data) {
      console.error('Error response from PayPal:');
      console.error(JSON.stringify(err.response.data, null, 2));
    } else {
      console.error('Request error:', err.message || err);
    }
    process.exit(1);
  }
}

run();
