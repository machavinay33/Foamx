type Product360Asset = { directory: string; frameCount: number; extension: 'webp' };

const product360Catalog: Record<string, Product360Asset> = {
  'ceramic-wash': { directory: '/media/product-spin/ceramic-wash', frameCount: 24, extension: 'webp' },
  'foam-shampoo': { directory: '/media/product-spin/foam-shampoo', frameCount: 24, extension: 'webp' },
};

export const getProduct360Frames = (slug: string): string[] => {
  const product = product360Catalog[slug];
  if (!product) return [];
  return Array.from({ length: product.frameCount }, (_, index) => `${product.directory}/${String(index + 1).padStart(2, '0')}.${product.extension}`);
};
