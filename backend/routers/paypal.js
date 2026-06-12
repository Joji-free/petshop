const express = require('express');
const router = express.Router();
const axios = require('axios');
const Productos = require('../models/productos');
const Accesorios = require('../models/accesorios');

// Load env variables if present (best-effort; app.js also loads dotenv)
try { require('dotenv').config(); } catch (e) { /* ignore */ }

const PAYPAL_CLIENT = process.env.PAYPAL_CLIENT_ID || '';
const PAYPAL_SECRET = process.env.PAYPAL_CLIENT_SECRET || '';
const PAYPAL_ENV = (process.env.PAYPAL_ENV === 'live') ? 'https://api-m.paypal.com' : 'https://api-m.sandbox.paypal.com';
const PENDING_ORDER_TTL_MS = 30 * 60 * 1000;
const pendingOrders = new Map();

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

function normalizeOrderItems(items) {
  const grouped = new Map();

  for (const rawItem of items) {
    const kind = rawItem?.kind === 'accesorio' ? 'accesorio' : 'producto';
    const itemId = String(rawItem?.itemId || rawItem?.sku || '').trim();
    const quantity = Math.max(1, parseInt(rawItem?.quantity ?? rawItem?.qty ?? 1, 10) || 1);

    if (!itemId) {
      const error = new Error('itemId is required for every item');
      error.status = 400;
      throw error;
    }

    const key = `${kind}:${itemId}`;
    const existing = grouped.get(key) || {
      itemId,
      kind,
      qty: 0,
      name: String(rawItem?.name || rawItem?.nombre || 'Item')
    };

    existing.qty += quantity;
    existing.name = String(rawItem?.name || rawItem?.nombre || existing.name || 'Item');
    grouped.set(key, existing);
  }

  return Array.from(grouped.values());
}

async function hydrateAndValidateOrderItems(items, currency) {
  const normalized = normalizeOrderItems(items);
  let total = 0;
  const enriched = [];

  for (const item of normalized) {
    const model = item.kind === 'accesorio' ? Accesorios : Productos;
    const document = await model.findById(item.itemId).exec();

    if (!document) {
      const error = new Error(`Item no encontrado: ${item.kind} ${item.itemId}`);
      error.status = 404;
      throw error;
    }

    const availableStock = Number(document.stock || 0);
    if (availableStock < item.qty) {
      const error = new Error(`Stock insuficiente para ${document.nombre}`);
      error.status = 409;
      error.details = {
        itemId: item.itemId,
        kind: item.kind,
        requested: item.qty,
        available: availableStock,
        name: document.nombre
      };
      throw error;
    }

    const unit = Number(document.precio || 0);
    total += Math.round(unit * item.qty * 100) / 100;

    enriched.push({
      itemId: item.itemId,
      kind: item.kind,
      qty: item.qty,
      name: String(document.nombre || item.name || 'Item'),
      unitAmount: unit,
      currency,
      availableStock
    });
  }

  return {
    items: enriched,
    total: Math.round(total * 100) / 100
  };
}

async function decrementStockForItems(items) {
  const appliedChanges = [];

  for (const item of items) {
    const model = item.kind === 'accesorio' ? Accesorios : Productos;
    const updated = await model.findOneAndUpdate(
      { _id: item.itemId, stock: { $gte: item.qty } },
      { $inc: { stock: -item.qty } },
      { new: true }
    ).exec();

    if (!updated) {
      const error = new Error(`No hay stock suficiente para ${item.name}`);
      error.status = 409;
      throw error;
    }

    appliedChanges.push({
      itemId: item.itemId,
      kind: item.kind,
      qty: item.qty,
      stock: updated.stock,
      name: updated.nombre
    });
  }

  return appliedChanges;
}

async function rollbackStockChanges(appliedChanges) {
  for (const change of [...appliedChanges].reverse()) {
    const model = change.kind === 'accesorio' ? Accesorios : Productos;
    try {
      await model.findByIdAndUpdate(change.itemId, { $inc: { stock: change.qty } }).exec();
    } catch (error) {
      console.error('rollbackStockChanges error', error.message || error);
    }
  }
}

function cleanupPendingOrders() {
  const now = Date.now();

  for (const [orderId, pending] of pendingOrders.entries()) {
    if (!pending || (now - pending.createdAt) > PENDING_ORDER_TTL_MS) {
      pendingOrders.delete(orderId);
    }
  }
}

// Create order
router.post('/create-order', async (req, res) => {
  try {
    // Expecting payload: { items: [{ name, unit_amount, quantity, sku? }], currency }
    const { items = [], currency = 'USD' } = req.body;

    if (!Array.isArray(items) || items.length === 0) return res.status(400).json({ error: 'items are required' });

    const orderData = await hydrateAndValidateOrderItems(items, currency);
    const paypalItems = orderData.items.map(it => ({
      name: it.name,
      unit_amount: { currency_code: currency, value: String(Number(it.unitAmount).toFixed(2)) },
      quantity: String(it.qty),
      sku: it.itemId,
      category: 'PHYSICAL_GOODS'
    }));
    const total = orderData.total;

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

    if (orderResp?.data?.id) {
      pendingOrders.set(orderResp.data.id, {
        items: orderData.items,
        total,
        currency,
        createdAt: Date.now()
      });
      cleanupPendingOrders();
    }

    return res.json(orderResp.data);
  } catch (err) {
    const status = err.status || 500;
    console.error('create-order error', err.response?.data || err.message);
    return res.status(status).json({ error: 'create-order-failed', details: err.details || err.response?.data || err.message });
  }
});

// Capture order
router.post('/capture-order', async (req, res) => {
  try {
    const { orderID, items = [] } = req.body;
    if (!orderID) return res.status(400).json({ error: 'orderID is required' });

    cleanupPendingOrders();

    const pending = pendingOrders.get(orderID);
    const orderItems = pending?.items?.length ? pending.items : (Array.isArray(items) ? normalizeOrderItems(items) : []);

    if (!orderItems.length) {
      return res.status(409).json({ error: 'order-items-not-found', details: 'No se encontraron los items necesarios para actualizar stock' });
    }

    const appliedStockChanges = await decrementStockForItems(orderItems);

    let captureResp;

    try {
      const accessToken = await getAccessTokenSafe();
      captureResp = await axios.post(`${PAYPAL_ENV}/v2/checkout/orders/${orderID}/capture`, {}, {
        headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' }
      });
    } catch (captureError) {
      await rollbackStockChanges(appliedStockChanges);
      throw captureError;
    }

    const data = captureResp.data || {};
    const purchaseUnit = data.purchase_units?.[0] || {};
    const capture = purchaseUnit.payments?.captures?.[0] || {};
    const amountCaptured = capture.amount || purchaseUnit.amount || null;
    const sellerReceivable = capture.seller_receivable_breakdown?.net_amount || null;

    const summary = {
      orderID: data.id || orderID,
      status: data.status || capture.status || 'UNKNOWN',
      payerEmail: data.payer?.email_address || null,
      payerName: data.payer?.name ? `${data.payer.name.given_name || ''} ${data.payer.name.surname || ''}`.trim() : null,
      amountCaptured,
      sellerReceivable,
      captureID: capture.id || null,
      captureStatus: capture.status || null,
      stockChanges: appliedStockChanges
    };

    // TODO: aquí podrías guardar la transacción en DB, limpiar el carrito, enviar email, etc.

    pendingOrders.delete(orderID);

    return res.json({ ...data, summary });
  } catch (err) {
    if (err && err.status === 409) {
      return res.status(409).json({ error: 'capture-order-stock-failed', details: err.details || err.message });
    }
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

