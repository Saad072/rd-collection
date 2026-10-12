/**
 * Seed the catalog from ~/workspace/rd-collection-deploy/scripts/starter-products.js.
 * Safe: skips entirely when products already exist, unless --force is passed
 * (which clears catalog collections only — never users, orders or carts).
 *
 * Usage: npm run seed [-- --force]
 */
import fs from 'fs';
import path from 'path';
import { connectDb, disconnectDb } from './db';
import { env } from './config/env';
import { Category } from './models/Category';
import { Collection } from './models/Collection';
import { Product } from './models/Product';
import { Banner } from './models/Banner';
import { User } from './models/User';
import { slugify } from './utils/text';
import bcrypt from 'bcryptjs';

const DEPLOY_ROOT = '/home/hatch/workspace/rd-collection-deploy';
const PUBLIC_DIR = path.resolve(process.cwd(), 'public');

interface SourceProduct {
  sku: string;
  slug: string;
  name: string;
  department: string;
  price: number; // rupees
  compare_at: number; // rupees
  sizes: string[];
  colors: string[];
  stock: number;
  is_new: boolean;
  fabric: string;
  image_urls: string[];
  description: string;
}

function loadSource(): SourceProduct[] {
  // The source file is CommonJS; require it directly.
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const products = require(path.join(
    DEPLOY_ROOT,
    'scripts/starter-products.js',
  )) as SourceProduct[];
  if (!Array.isArray(products) || !products.length) {
    throw new Error('starter-products.js did not export a product array');
  }
  return products;
}

function colorCode(color: string): string {
  return color
    .split(/\s+/)
    .map((w) => w[0])
    .join('')
    .toUpperCase();
}

/** Copy a deploy image into the API's public dir; return its public URL. */
function publishImage(deployRelUrl: string): string {
  const src = path.join(DEPLOY_ROOT, 'public', deployRelUrl.replace(/^\//, ''));
  const dest = path.join(PUBLIC_DIR, deployRelUrl.replace(/^\//, ''));
  if (fs.existsSync(src)) {
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.copyFileSync(src, dest);
  }
  return deployRelUrl;
}

async function main() {
  const force = process.argv.includes('--force');
  await connectDb();

  const existing = await Product.countDocuments({});
  if (existing > 0 && !force) {
    console.info(`[seed] ${existing} products already exist — skipping (use --force to reseed).`);
    await disconnectDb();
    return;
  }
  if (force) {
    await Promise.all([
      Product.deleteMany({}),
      Collection.deleteMany({}),
      Category.deleteMany({}),
      Banner.deleteMany({}),
    ]);
    console.info('[seed] cleared catalog collections.');
  }

  const source = loadSource();

  // ---- categories (from departments) ----
  const departments = [...new Set(source.map((p) => p.department))];
  const deptNames: Record<string, string> = {
    'kurta-kurti': 'Kurta & Kurti',
    workwear: 'Workwear',
    'ethnic-sets': 'Ethnic Sets',
    sarees: 'Sarees',
    'fusion-wear': 'Fusion Wear',
  };
  await Category.insertMany(
    departments.map((d, i) => ({
      slug: d,
      name: deptNames[d] ?? d,
      parent: null,
      description: `Shop ${deptNames[d] ?? d} at RD_COLLECTION.`,
      sortOrder: i,
      active: true,
    })),
  );
  console.info(`[seed] categories: ${departments.length}`);

  // ---- collections ----
  const collections: Array<{ slug: string; title: string; description: string; displayOrder: number }> = [
    { slug: 'new-arrivals', title: 'New Arrivals', description: 'The latest drops at RD_COLLECTION.', displayOrder: 0 },
    { slug: 'workwear', title: 'Workwear', description: 'Office-ready ethnic and contemporary styles.', displayOrder: 1 },
    { slug: 'ethnic-sets', title: 'Ethnic Sets', description: 'Complete kurta sets for every occasion.', displayOrder: 2 },
    { slug: 'kurta-kurti', title: 'Kurta & Kurti', description: 'Everyday kurtas and kurtis in breathable fabrics.', displayOrder: 3 },
    { slug: 'sarees', title: 'Sarees', description: 'Timeless six-yard elegance.', displayOrder: 4 },
    { slug: 'fusion-wear', title: 'Fusion Wear', description: 'Modern silhouettes with Indian soul.', displayOrder: 5 },
    { slug: 'sale', title: 'Sale', description: 'Up to 50% off — limited stock.', displayOrder: 6 },
  ];
  await Collection.insertMany(collections.map((c) => ({ ...c, active: true, productIds: [] })));
  console.info(`[seed] collections: ${collections.length}`);

  // ---- products ----
  let variantTotal = 0;
  for (const sp of source) {
    const n = sp.sizes.length * sp.colors.length;
    const base = Math.floor(sp.stock / n);
    let remainder = sp.stock % n;
    const variants = [];
    for (const size of sp.sizes) {
      for (const color of sp.colors) {
        const stock = base + (remainder > 0 ? 1 : 0);
        if (remainder > 0) remainder--;
        variants.push({
          sku: `${sp.sku}-${size.replace(/\s+/g, '')}-${colorCode(color)}`.toUpperCase(),
          size,
          color,
          pricePaise: Math.round(sp.price * 100),
          compareAtPaise: Math.round(sp.compare_at * 100),
          stock,
          active: true,
        });
      }
    }
    variantTotal += variants.length;
    const imageUrl = sp.image_urls[0] ? publishImage(sp.image_urls[0]) : '';
    const productCollections = [sp.department, 'sale'];
    if (sp.is_new) productCollections.unshift('new-arrivals');
    const created = await Product.create({
      name: sp.name,
      slug: slugify(sp.slug),
      description: sp.description,
      category: sp.department,
      collections: productCollections,
      images: imageUrl ? [{ url: imageUrl, alt: sp.name }] : [],
      attributes: { fabric: sp.fabric, care: 'Machine wash cold, dry in shade' },
      fabric: sp.fabric,
      tags: [sp.department],
      status: 'published',
      isNew: sp.is_new,
      soldCount: 0,
      variants,
    });
    // keep collection productIds in sync
    await Collection.updateMany(
      { slug: { $in: created.collections } },
      { $addToSet: { productIds: created._id } },
    );
  }
  console.info(`[seed] products: ${source.length}, variants: ${variantTotal}`);

  // ---- banners ----
  const heroSrc = path.join(DEPLOY_ROOT, 'public/images/hero.jpg');
  let heroUrl = '';
  if (fs.existsSync(heroSrc)) {
    const heroDest = path.join(PUBLIC_DIR, 'images/hero.jpg');
    fs.mkdirSync(path.dirname(heroDest), { recursive: true });
    fs.copyFileSync(heroSrc, heroDest);
    heroUrl = '/images/hero.jpg';
  }
  await Banner.insertMany([
    {
      title: 'Everyday Ethnic, Elevated',
      subtitle: 'New season kurta sets, sarees and workwear — made in India.',
      image: heroUrl || '/images/hero.jpg',
      link: '/collections/new-arrivals',
      ctaLabel: 'Shop Now',
      position: 'home-hero',
      displayOrder: 0,
      active: true,
    },
    {
      title: 'Festive Sale — up to 50% off',
      subtitle: 'Stunning ethnic sets for the festive season.',
      image: heroUrl || '/images/hero.jpg',
      link: '/collections/sale',
      ctaLabel: 'Shop Sale',
      position: 'home-promo',
      displayOrder: 0,
      active: true,
    },
  ]);
  console.info('[seed] banners: 2');

  // ---- admin user ----
  const adminEmail = env.ADMIN_EMAIL.toLowerCase();
  const existingAdmin = await User.findOne({ email: adminEmail });
  if (!existingAdmin) {
    await User.create({
      name: 'Store Admin',
      email: adminEmail,
      passwordHash: await bcrypt.hash(env.ADMIN_PASSWORD, 10),
      role: 'admin',
    });
    console.info(`[seed] admin user created: ${adminEmail}`);
  } else {
    console.info(`[seed] admin user already exists: ${adminEmail}`);
  }

  console.info('[seed] done.');
  await disconnectDb();
}

main().catch(async (err) => {
  console.error('[seed] failed:', err instanceof Error ? err.message : err);
  await disconnectDb();
  process.exit(1);
});
