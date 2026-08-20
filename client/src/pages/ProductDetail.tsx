import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, Play, ShoppingBag } from 'lucide-react';
import { useLocation, useRoute } from 'wouter';
import { Button } from '@/components/ui/button';
import { getProducts, type Product } from '@/lib/supabase';

const productVideoUrls: Record<string, string> = {
  'ceramic-wash': '/media/ceramic-wash.mp4',
  'foam-shampoo': '/media/foam-shampoo.mp4',
};

type GalleryMedia = { type: 'video' | 'image'; src: string };

export default function ProductDetail() {
  const [, params] = useRoute('/products/:slug');
  const [, navigate] = useLocation();
  const [product, setProduct] = useState<Product | null>(null);
  const [selected, setSelected] = useState(0);

  useEffect(() => {
    getProducts().then(items => setProduct(items.find(item => item.slug === params?.slug) ?? null));
  }, [params?.slug]);

  const media = useMemo<GalleryMedia[]>(() => {
    if (!product) return [];
    const items: GalleryMedia[] = [];
    const productVideo = productVideoUrls[product.slug];
    if (productVideo) items.push({ type: 'video', src: productVideo });
    const gallery = product.gallery?.length ? product.gallery : [product.image_url];
    gallery.filter(Boolean).forEach(src => items.push({ type: 'image', src }));
    return items;
  }, [product]);

  if (!product) {
    return <main className="grid min-h-screen place-items-center bg-[#08090a] px-5 text-center text-white"><div><p className="eyebrow">FOAMX / 404</p><h1 className="mt-4 font-display text-5xl font-black uppercase">Product not found.</h1><p className="mt-3 text-sm text-white/50">This formula may be inactive or no longer available.</p><Button onClick={() => navigate('/')} className="mt-6 rounded-none bg-[#d4a94d] text-xs font-black uppercase tracking-[.15em] text-black">Return home</Button></div></main>;
  }

  const activeMedia = media[selected] ?? { type: 'image' as const, src: product.image_url };

  return <main className="min-h-screen bg-[#08090a] px-5 py-10 text-white lg:px-8"><div className="mx-auto max-w-6xl"><button onClick={() => navigate('/')} className="mb-10 flex items-center gap-2 text-xs uppercase tracking-[.2em] text-white/50 hover:text-[#d4a94d]"><ArrowLeft size={15}/> Back to FOAMX</button><div className="grid gap-10 md:grid-cols-2"><div><div className="relative aspect-square overflow-hidden bg-[#e9e9e7]">{activeMedia.type === 'video' ? <><video autoPlay muted loop playsInline preload="auto" onLoadedMetadata={event => { event.currentTarget.muted = true; void event.currentTarget.play().catch(() => undefined); }} className="h-full w-full object-cover" src={activeMedia.src}/><div className="pointer-events-none absolute bottom-4 left-4 flex items-center gap-2 bg-black/75 px-3 py-2 text-[10px] font-bold uppercase tracking-[.18em] text-white"><Play size={12} fill="currentColor"/> Product video</div></> : <img src={activeMedia.src} className="h-full w-full object-contain p-10 mix-blend-multiply" alt={product.name}/>}</div><div className="mt-4 flex gap-3 overflow-x-auto">{media.map((item, index) => <button key={item.src + index} onClick={() => setSelected(index)} aria-label={`View ${item.type} ${index + 1}`} className={`relative h-20 w-20 shrink-0 overflow-hidden bg-[#e9e9e7] ${selected === index ? 'ring-2 ring-[#d4a94d]' : ''}`}>{item.type === 'video' ? <video muted playsInline preload="metadata" className="h-full w-full object-cover" src={item.src}/> : <img src={item.src} className="h-full w-full object-contain p-2 mix-blend-multiply" alt=""/>}{item.type === 'video' && <span className="absolute inset-0 grid place-items-center bg-black/25"><Play size={15} fill="white"/></span>}</button>)}</div></div><div className="flex flex-col justify-center"><p className="eyebrow">FOAMX / Product detail</p><h1 className="mt-4 font-display text-6xl font-black uppercase leading-none">{product.name}</h1><p className="mt-6 text-base leading-8 text-white/55">{product.description}</p><div className="my-8 flex items-center justify-between border-y border-white/10 py-6"><span className="text-xs uppercase tracking-[.2em] text-white/40">Current price</span><span className="font-display text-4xl font-bold text-[#d4a94d]">₹{product.price.toLocaleString('en-IN')}</span></div><Button onClick={() => { const items = JSON.parse(localStorage.getItem('foamx-cart') ?? '[]'); const existing = items.find((item: Product & {quantity:number}) => item.id === product.id); localStorage.setItem('foamx-cart', JSON.stringify(existing ? items.map((item: Product & {quantity:number}) => item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item) : [...items, { ...product, quantity: 1 }])); navigate('/'); }} className="rounded-none bg-[#d4a94d] py-6 text-xs font-black uppercase tracking-[.15em] text-black">Add to cart <ShoppingBag size={15} className="ml-2"/></Button></div></div></div></main>;
}
