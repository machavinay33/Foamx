import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, ShoppingBag, X } from 'lucide-react';
import { useLocation, useRoute } from 'wouter';
import { Button } from '@/components/ui/button';
import Product3DViewer from '@/components/Product3DViewer';
import { getProducts, type Product } from '@/lib/supabase';

const productImageUrls: Record<string, string> = {
  'ceramic-wash': '/media/ceramic-wash-poster.jpg',
  'foam-shampoo': '/media/foam-shampoo-poster.jpg',
};
const productFrameSources: Record<string, string[]> = {
  'ceramic-wash': Array.from({ length: 37 }, (_, index) => `/media/product-spin/ceramic-wash/frame-${String(index + 1).padStart(2, '0')}.jpg`),
  'foam-shampoo': Array.from({ length: 38 }, (_, index) => `/media/product-spin/foam-shampoo/frame-${String(index + 1).padStart(2, '0')}.jpg`),
};

type GalleryMedia = { type: 'image'; sources: string[] };

export default function ProductDetail() {
  const [, params] = useRoute('/products/:slug');
  const [, navigate] = useLocation();
  const [product, setProduct] = useState<Product | null>(null);
  const [selected, setSelected] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    setSelected(0);
    getProducts()
      .then(items => setProduct(items.find(item => item.slug === params?.slug) ?? null))
      .finally(() => setLoading(false));
  }, [params?.slug]);

  const media = useMemo<GalleryMedia[]>(() => {
    if (!product) return [];
    const sources = [productImageUrls[product.slug], ...(product.gallery ?? []), product.image_url].filter(Boolean) as string[];
    return Array.from(new Set(sources)).map(src => ({ type: 'image', sources: [src] }));
  }, [product]);

  const goBack = () => navigate('/');

  if (loading) {
    return <main className="grid min-h-screen place-items-center bg-[#08090a] px-5 text-center text-white"><div><p className="eyebrow">FOAMX / loading</p><div className="mx-auto mt-5 h-10 w-10 animate-spin rounded-full border-2 border-white/15 border-t-[#d4a94d]"/><p className="mt-5 text-sm text-white/45">Preparing your FOAMX formula.</p></div></main>;
  }

  if (!product) {
    return <main className="grid min-h-screen place-items-center bg-[#08090a] px-5 text-center text-white"><div><p className="eyebrow">FOAMX / 404</p><h1 className="mt-4 font-display text-5xl font-black uppercase">Product not found.</h1><Button onClick={goBack} className="mt-6 rounded-none bg-[#d4a94d] text-xs font-black uppercase tracking-[.15em] text-black">Return home</Button></div></main>;
  }

  const activeMedia = media[selected] ?? { type: 'image' as const, sources: [productImageUrls[product.slug] ?? product.image_url] };

  return (
    <main className="min-h-screen bg-[#08090a] px-5 py-8 text-white lg:px-8">
      <div className="mx-auto max-w-6xl">
        <div className="mb-8 flex items-center justify-between gap-3">
          <button onClick={goBack} className="flex items-center gap-2 text-xs uppercase tracking-[.2em] text-white/55 hover:text-[#d4a94d]"><ArrowLeft size={15}/> Back to FOAMX</button>
          <button onClick={goBack} className="flex items-center gap-2 border border-white/20 px-3 py-2 text-[10px] font-bold uppercase tracking-[.15em] text-white/70 hover:border-[#d4a94d] hover:text-[#d4a94d]">Cancel <X size={13}/></button>
        </div>
        <div className="grid gap-10 md:grid-cols-2">
          <div>
            <div className="relative aspect-square overflow-hidden bg-[#e9e9e7]">
              <Product3DViewer name={product.name} image={activeMedia.sources[0]} frames={productFrameSources[product.slug]} />
            </div>
            <div className="mt-4 flex gap-3 overflow-x-auto">
              {media.map((item, index) => <button key={`${item.sources[0]}-${index}`} onClick={() => setSelected(index)} aria-label={`View media ${index + 1}`} className={`relative h-20 w-20 shrink-0 overflow-hidden bg-[#e9e9e7] ${selected === index ? 'ring-2 ring-[#d4a94d]' : ''}`}><img src={item.sources[0]} className="h-full w-full object-cover" alt="" /></button>)}
            </div>
          </div>
          <div className="flex flex-col justify-center">
            <p className="eyebrow">FOAMX / Product detail</p>
            <h1 className="mt-4 font-display text-6xl font-black uppercase leading-none">{product.name}</h1>
            <p className="mt-6 text-base leading-8 text-white/55">{product.description}</p>
            <div className="my-8 flex items-center justify-between border-y border-white/10 py-6"><span className="text-xs uppercase tracking-[.2em] text-white/40">Current price</span><span className="font-display text-4xl font-bold text-[#d4a94d]">₹{product.price.toLocaleString('en-IN')}</span></div>
            <Button onClick={() => { const items = JSON.parse(localStorage.getItem('foamx-cart') ?? '[]'); const existing = items.find((item: Product & { quantity: number }) => item.id === product.id); localStorage.setItem('foamx-cart', JSON.stringify(existing ? items.map((item: Product & { quantity: number }) => item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item) : [...items, { ...product, quantity: 1 }])); navigate('/'); }} className="rounded-none bg-[#d4a94d] py-6 text-xs font-black uppercase tracking-[.15em] text-black">Add to cart <ShoppingBag size={15} className="ml-2"/></Button>
          </div>
        </div>
      </div>
    </main>
  );
}
