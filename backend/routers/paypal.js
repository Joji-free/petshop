const express = require('express');
const router = express.Router();
const axios = require('axios');

// Load env variables if present (best-effort; app.js also loads dotenv)
try { require('dotenv').config(); } catch (e) { /* ignore */ }

const PAYPAL_CLIENT = process.env.PAYPAL_CLIENT_ID || '';
const PAYPAL_SECRET = process.env.PAYPAL_CLIENT_SECRET || '';
const PAYPAL_ENV = (process.env.PAYPAL_ENV === 'live') ? 'https://api-m.paypal.com' : 'https://api-m.sandbox.paypal.com';

// Basic debug info (do NOT log secrets in production)
console.log('PayPal router initialized. PAYPAL_ENV=', process.env.PAYPAL_ENV || 'sandbox', ' clientIdLoaded=', !!PAYPAL_CLIENT);
if (PAYPAL_CLIENT && typeof PAYPAL_CLIENT === 'string') {
  console.log('PayPal client id (prefix):', PAYPAL_CLIENT.substring(0, 10) + '...');
}

async function getAccessToken() {
  const auth = Buffer.from(`${PAYPAL_CLIENT}:${PAYPAL_SECRET}`).toString('base64');
  const url = `${PAYPAL_ENV}/v1/oauth2/token`;
  const params = new URLSearchParams();
  params.append('grant_type', 'client_credentials');

  const resp = await axios.post(url, params.toString(), {
    headers: {
      'Authorization': `Basic ${auth}`,
      'Content-Type': 'application/x-www-form-urlencoded'
    }
  });

  return resp.data.access_token;
}

// Improved token fetching with better error details
async function getAccessTokenSafe() {
  try {
    return await getAccessToken();
  } catch (err) {
    // Log helpful debug info
    console.error('getAccessToken failed. PAYPAL_CLIENT present:', !!PAYPAL_CLIENT);
    if (err.response && err.response.data) {
      console.error('PayPal token error response:', JSON.stringify(err.response.data));
      // rethrow to be handled by callers
      const e = new Error('PayPal token fetch failed: ' + JSON.stringify(err.response.data));
      e.data = err.response.data;
      throw e;
    }
    console.error('getAccessToken error:', err.message || err);
    throw err;
  }
}

// Create order
router.post('/create-order', async (req, res) => {
  try {
    // Expecting payload: { items: [{ name, unit_amount, quantity, sku? }], currency }
    const { items = [], currency = 'USD' } = req.body;

    if (!Array.isArray(items) || items.length === 0) return res.status(400).json({ error: 'items are required' });

    // compute totals server-side for safety
    let total = 0;
    const paypalItems = items.map(it => {
      const unit = Number(it.unit_amount) || Number(it.price) || 0;
      const qty = Number(it.quantity) || Number(it.qty) || 1;
      const itemTotal = Math.round(unit * qty * 100) / 100;
      total += itemTotal;
      return {
        name: String(it.name || it.nombre || 'Item'),
        unit_amount: { currency_code: currency, value: String(unit.toFixed(2)) },
        quantity: String(qty),
        sku: it.sku || it.itemId || undefined
      };
    });

    total = Math.round(total * 100) / 100;

    const accessToken = await getAccessTokenSafe();

    const orderBody = {
      intent: 'CAPTURE',
      purchase_units: [{
        amount: {
          currency_code: currency,
          value: String(total.toFixed(2)),
          breakdown: {
            item_total: { currency_code: currency, value: String(total.toFixed(2)) }
          }
        },
        items: paypalItems
      }]
    };

    const orderResp = await axios.post(`${PAYPAL_ENV}/v2/checkout/orders`, orderBody, {
      headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' }
    });

    return res.json(orderResp.data);
  } catch (err) {
    console.error('create-order error', err.response?.data || err.message);
    return res.status(500).json({ error: 'create-order-failed', details: err.response?.data || err.message });
  }
});

// Capture order
router.post('/capture-order', async (req, res) => {
  try {
    const { orderID } = req.body;
    if (!orderID) return res.status(400).json({ error: 'orderID is required' });

    const accessToken = await getAccessTokenSafe();
    const captureResp = await axios.post(`${PAYPAL_ENV}/v2/checkout/orders/${orderID}/capture`, {}, {
      headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' }
    });

    // TODO: aquí podrías guardar la transacción en DB, limpiar el carrito, enviar email, etc.

    return res.json(captureResp.data);
  } catch (err) {
    console.error('capture-order error', err.response?.data || err.message);
    return res.status(500).json({ error: 'capture-order-failed', details: err.response?.data || err.message });
  }
});

// Expose public config (client id + env) - safe to expose client id
router.get('/config', (req, res) => {
  return res.json({ clientId: PAYPAL_CLIENT || null, env: process.env.PAYPAL_ENV || 'sandbox' });
});

// Test endpoint: try to fetch access token and return status (useful for debugging)
router.get('/test-token', async (req, res) => {
  try {
    const token = await getAccessTokenSafe();
    return res.json({ ok: true, tokenPresent: !!token });
  } catch (err) {
    return res.status(500).json({ ok: false, error: err.data || err.message || String(err) });
  }
});

// Debug info (safe): shows env, clientId prefix and secret length (never expose the secret)
router.get('/debug', (req, res) => {
  try {
    const cid = PAYPAL_CLIENT || null;
    const secret = PAYPAL_SECRET || null;
    return res.json({
      env: process.env.PAYPAL_ENV || 'sandbox',
      clientIdLoaded: !!cid,
      clientIdPrefix: cid ? (String(cid).substring(0, 8) + '...') : null,
      secretLoaded: !!secret,
      secretLength: secret ? String(secret).length : 0
    });
  } catch (e) {
    return res.status(500).json({ ok: false, error: String(e) });
  }
});

module.exports = router;

