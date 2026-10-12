import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { CartItem } from '../types';
import { api } from '../services/api';

export interface NewCartItem extends Omit<CartItem, 'qty'> {
  qty?: number;
}

interface CartState {
  items: CartItem[];
  drawerOpen: boolean;
  openDrawer: () => void;
  closeDrawer: () => void;
  /** Merge the local guest cart into the server cart after login. */
  syncWithServer: () => Promise<void>;
  addItem: (item: NewCartItem) => void;
  removeItem: (productId: string, variantId: string) => void;
  setQty: (productId: string, variantId: string, qty: number) => void;
  clear: () => void;
  subtotalPaise: () => number;
  count: () => number;
}

function keyOf(i: Pick<CartItem, 'productId' | 'variantId'>) {
  return `${i.productId}__${i.variantId}`;
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      drawerOpen: false,
      openDrawer: () => set({ drawerOpen: true }),
      closeDrawer: () => set({ drawerOpen: false }),

      syncWithServer: async () => {
        const local = get().items;
        if (local.length === 0) return;
        // Best-effort: push each local line to the server cart, then adopt server state.
        try {
          for (const item of local) {
            await api.cart.addItem({ productId: item.productId, variantId: item.variantId, qty: item.qty });
          }
          const server = await api.cart.get();
          set({ items: server.items });
        } catch {
          // Offline / not logged in — keep local cart untouched.
        }
      },

      addItem: (item) =>
        set((s) => {
          const qty = Math.max(1, item.qty ?? 1);
          const existing = s.items.find(
            (i) => i.productId === item.productId && i.variantId === item.variantId,
          );
          if (existing) {
            return {
              items: s.items.map((i) =>
                keyOf(i) === keyOf(item) ? { ...i, qty: Math.min(99, i.qty + qty) } : i,
              ),
            };
          }
          return { items: [...s.items, { ...item, qty }] };
        }),

      removeItem: (productId, variantId) =>
        set((s) => ({
          items: s.items.filter((i) => !(i.productId === productId && i.variantId === variantId)),
        })),

      setQty: (productId, variantId, qty) =>
        set((s) => {
          if (qty <= 0) {
            return {
              items: s.items.filter((i) => !(i.productId === productId && i.variantId === variantId)),
            };
          }
          return {
            items: s.items.map((i) =>
              i.productId === productId && i.variantId === variantId
                ? { ...i, qty: Math.min(99, Math.max(1, qty)) }
                : i,
            ),
          };
        }),

      clear: () => set({ items: [] }),

      subtotalPaise: () => get().items.reduce((sum, i) => sum + i.unitPaise * i.qty, 0),
      count: () => get().items.reduce((n, i) => n + i.qty, 0),
    }),
    {
      name: 'rd-collection-cart',
      partialize: (s) => ({ items: s.items }),
    },
  ),
);
