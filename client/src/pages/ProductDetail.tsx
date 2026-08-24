import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, Play, ShoppingBag, X } from 'lucide-react';
import { useLocation, useRoute } from 'wouter';
import { Button } from '@/components/ui/button';
import Product3DViewer from '@/components/Product3DViewer';
import { getProducts, type Product } from '@/lib/supabase';

const productPosterUrls: Record<string, string> = { 'ceramic-wash': '/media/ceramic-wash-poster.jpg', 'foam-shampoo': '/media/foam-shampoo-poster.jpg' };
const productVideoSources: Record<string, string[]> = {
  'ceramic-wash': ['/media/ceramic-wash.mp4', '/manus-storage/d3c085bf-6926-4ce9-b1d3-efa0601747fc_3d3179cb.mp4', 'https://raw.githubusercontent.com/machavinay33/Foamx/main/client/public/media/ceramic-wash.mp4'],
  'foam-shampoo': ['/media/foam-shampoo.mp4', '/manus-storage/2f91d3df-a7a9-40c1-a9c7-09bf0182b2c0_7448ea13.mp4', 'https://raw.githubusercontent.com/machavinay33/Foamx/main/client/public/media/foam-shampoo.mp4'],
};

type GalleryMedia = { type: 'video' | 'image'; sources: string[] };

function ResilientVideo({ sources, poster, className }: { sources: string[]; poster?: string; className: string }) {
  const [sourceIndex, setSourceIndex] = useState(0);
  const source = sources[Math.min(sourceIndex, sources.length - 1)];
  const play = (element: HTMLVideoElement) => { element.muted = true; void element.play().catch(() => undefined); };
  return <video autoPlay muted loop playsInline preload="auto" poster={poster} key={source} onLoadedData={event => play(event.currentTarget)} onCanPlay={event => play(event.currentTarget)} onError={() => setSourceIndex(index => Math.min(index + 1, sources.length - 1))} className={className}><source src={source} type="video/mp4" /></video>;
}

export default function ProductDetail() {
  const [, params] = useRoute('/products/:slug');
  const [, navigate] = useLocation();
  const [product, setProduct] = useState<Product | null>(null);
  const [selected, setSelected] = useState(0);
  const [loading, setLoading] = useState(true);
  useEffect(() => { setLoading(true); setSelected(0); getProducts().then(items => setProduct(items.find(item => item.slug === params?.slug) ?? null)).finally(() => setLoading(false)); }, [params?.slug]);
  const media = useMemo<GalleryMedia[]>(() => {
    if (!product) return [];
    const items: GalleryMedia[] = [];
    if (productVideoSources[product.slug]) items.push({ type: 'video', sources: productVideoSources[product.slug] });
    (product.gallery?.length ? product.gallery : [product.image_url]).filter(Boolean).forEach(src => items.push({ type: 'image', sources: [src] }));
    return items;
  }, [product]);
  const goBack = () => navigate('/');
  if (loading) return <main className="grid min-h-screen place-items-center bg-[#08090a] px-5 text-center text-white"><div><p className="eyebrow">FOAMX / loading</p><div className="mx-auto mt-5 h-10 w-10 animate-spin rounded-full border-2 border-white/15 border-t-[#d4a94d]"/><p className="mt-5 text-sm text-white/45">Preparing your FOAMX formula.</p></div></main>;
  if (!product) return <main className="grid min-h-screen place-items-center bg-[#08090a] px-5 text-center text-white"><div><p className="eyebrow">FOAMX / 404</p><h1 className="mt-4 font-display text-5xl font-black uppercase">Product not found.</h1><Button onClick={goBack} className="mt-6 rounded-none bg-[#d4a94d] text-xs font-black uppercase tracking-[.15em] text-black">Return home</Button></div></main>;
  const activeMedia = media[selected] ?? { type: 'image' as const, sources: [product.image_url] };
  return <main className="min-h-screen bg-[#08090a] px-5 py-8 text-white lg:px-8"><div className="mx-auto max-w-6xl"><div className="mb-8 flex items-center justify-between gap-3"><button onClick={goBack} className="flex items-center gap-2 text-xs uppercase tracking-[.2em] text-white/55 hover:text-[#d4a94d]"><ArrowLeft size={15}/> Back to FOAMX</button><button onClick={goBack} className="flex items-center gap-2 border border-white/20 px-3 py-2 text-[10px] font-bold uppercase tracking-[.15em] text-white/70 hover:border-[#d4a94d] hover:text-[#d4a94d]">Cancel <X size={13}/></button></div><div className="grid gap-10 md:grid-cols-2"><div><div className="relative aspect-square overflow-hidden bg-[#e9e9e7]"><Product3DViewer name={product.name} sources={activeMedia.type === 'video' ? activeMedia.sources : []} poster={productPosterUrls[product.slug]} image={activeMedia.type === 'image' ? activeMedia.sources[0] : undefined} /></div><div className="mt-4 flex gap-3 overflow-x-auto">{media.map((item, index) => <button key={`${item.sources[0]}-${index}`} onClick={() => setSelected(index)} aria-label={`View media ${index + 1}`} className={`relative h-20 w-20 shrink-0 overflow-hidden bg-[#e9e9e7] ${selected === index ? 'ring-2 ring-[#d4a94d]' : ''}`}>{item.type === 'video' ? <ResilientVideo sources={item.sources} poster={productPosterUrls[product.slug]} className="h-full w-full object-cover"/> : <img src={item.sources[0]} className="h-full w-full object-contain p-2 mix-blend-multiply" alt=""/>}{item.type === 'video' && <span className="absolute inset-0 grid place-items-center bg-black/25"><Play size={15} fill="white"/></span>}</button>)}</div></div><div className="flex flex-col justify-center"><p className="eyebrow">FOAMX / Product detail</p><h1 className="mt-4 font-display text-6xl font-black uppercase leading-none">{product.name}</h1><p className="mt-6 text-base leading-8 text-white/55">{product.description}</p><div className="my-8 flex items-center justify-between border-y border-white/10 py-6"><span className="text-xs uppercase tracking-[.2em] text-white/40">Current price</span><span className="font-display text-4xl font-bold text-[#d4a94d]">₹{product.price.toLocaleString('en-IN')}</span></div><Button onClick={() => { const items = JSON.parse(localStorage.getItem('foamx-cart') ?? '[]'); const existing = items.find((item: Product & { quantity: number }) => item.id === product.id); localStorage.setItem('foamx-cart', JSON.stringify(existing ? items.map((item: Product & { quantity: number }) => item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item) : [...items, { ...product, quantity: 1 }])); navigate('/'); }} className="rounded-none bg-[#d4a94d] py-6 text-xs font-black uppercase tracking-[.15em] text-black">Add to cart <ShoppingBag size={15} className="ml-2"/></Button></div></div></div></main>;
}
