import axios from 'axios';
import { WooCommerceProvider, WooCustomer, WooOrder } from './woocommerce.provider.js';

import https from 'https';

export class LiveWooCommerceProvider implements WooCommerceProvider {
  private url: string;
  private key: string;
  private secret: string;

  constructor() {
    this.url = (process.env.WOO_STORE_URL || '').replace(/\/$/, '');
    this.key = process.env.WOO_CONSUMER_KEY || '';
    this.secret = process.env.WOO_CONSUMER_SECRET || '';
  }

  async getCustomers(): Promise<WooCustomer[]> {
    if (!this.url || !this.key || !this.secret) {
      console.warn('LiveWooCommerceProvider: missing URL or credentials');
      return [];
    }
    try {
      const res = await axios.get(`${this.url}/wp-json/wc/v3/customers`, {
        params: {
          per_page: 100,
          consumer_key: this.key,
          consumer_secret: this.secret
        },
        auth: { username: this.key, password: this.secret },
        headers: { 'X-Forwarded-Proto': 'https' },
        httpsAgent: new https.Agent({ rejectUnauthorized: false }),
        timeout: 10000
      });
      return Array.isArray(res.data) ? res.data : [];
    } catch (err: any) {
      console.error('Failed to fetch customers from live WooCommerce:', err.response?.data || err.message);
      return [];
    }
  }

  async getOrders(): Promise<WooOrder[]> {
    if (!this.url || !this.key || !this.secret) {
      console.warn('LiveWooCommerceProvider: missing URL or credentials');
      return [];
    }
    try {
      const res = await axios.get(`${this.url}/wp-json/wc/v3/orders`, {
        params: {
          per_page: 100,
          consumer_key: this.key,
          consumer_secret: this.secret
        },
        auth: { username: this.key, password: this.secret },
        headers: { 'X-Forwarded-Proto': 'https' },
        httpsAgent: new https.Agent({ rejectUnauthorized: false }),
        timeout: 10000
      });
      return Array.isArray(res.data) ? res.data : [];
    } catch (err: any) {
      console.error('Failed to fetch orders from live WooCommerce:', err.response?.data || err.message);
      return [];
    }
  }
}

