import { Router } from 'express';
import categories from './categories';
import collections from './collections';
import products from './products';
import search from './search';
import banners from './banners';
import newsletter from './newsletter';
import pincode from './pincode';
import auth from './auth';
import cart from './cart';
import orders from './orders';
import payments, { webhookRouter } from './payments';
import admin from './admin';

const v1 = Router();

v1.use('/categories', categories);
v1.use('/collections', collections);
v1.use('/products', products);
v1.use('/search', search);
v1.use('/banners', banners);
v1.use('/newsletter', newsletter);
v1.use('/pincode', pincode);
v1.use('/auth', auth);
v1.use('/cart', cart);
v1.use('/orders', orders);
v1.use('/payments/webhook', webhookRouter);
v1.use('/payments', payments);
v1.use('/admin', admin);

export default v1;
