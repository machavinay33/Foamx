import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase: SupabaseClient | null = supabaseUrl && supabaseAnonKey
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

export type Product = {
  id: string;
  name: string;
  slug: string;
  description: string;
  price: number;
  image_url: string;
  gallery: string[];
  featured: boolean;
  status: 'active' | 'inactive';
};

export type Offer = {
  id: string;
  title: string;
  description: string;
  banner_image?: string | null;
  active: boolean;
};

export const fallbackProducts: Product[] = [
  {
    id: 'ceramic-wash',
    name: 'Ceramic Wash',
    slug: 'ceramic-wash',
    description: 'A high-lubricity ceramic wash that lifts grime and leaves a slick, reflective finish.',
    price: 399,
    image_url: '/media/foamx-logo.png',
    gallery: ['/media/foamx-logo.png'],
    featured: true,
    status: 'active',
  },
  {
    id: 'foam-shampoo',
    name: 'Foam Shampoo',
    slug: 'foam-shampoo',
    description: 'Thick, pH-balanced snow foam engineered for a deep clean without compromising protection.',
    price: 349,
    image_url: '/media/foamx-logo.png',
    gallery: ['/media/foamx-logo.png'],
    featured: true,
    status: 'active',
  },
];

export async function getProducts(): Promise<Product[]> {
  if (!supabase) return fallbackProducts;
  const { data, error } = await supabase.from('products').select('*').eq('status', 'active').order('sort_order');
  if (error || !data?.length) return fallbackProducts;
  return data as Product[];
}

export async function getOffers(): Promise<Offer[]> {
  if (!supabase) return [];
  const { data } = await supabase.from('offers').select('*').eq('active', true).order('created_at', { ascending: false });
  return (data ?? []) as Offer[];
}

export async function submitOrder(payload: {
  customer_name: string; phone: string; address: string; items: Array<{ product_id: string; product_name: string; price: number; quantity: number }>;
  total: number;
}) {
  const orderNumber = `FX-${Date.now().toString(36).toUpperCase()}`;
  if (!supabase) {
    const existing = JSON.parse(localStorage.getItem('foamx-orders') ?? '[]');
    localStorage.setItem('foamx-orders', JSON.stringify([{ ...payload, order_number: orderNumber, status: 'pending', created_at: new Date().toISOString() }, ...existing]));
    return { orderNumber };
  }
  const { data: order, error } = await supabase.from('orders').insert({ ...payload, order_number: orderNumber, status: 'pending' }).select('id, order_number').single();
  if (error) throw error;
  return { orderNumber: order.order_number };
}
