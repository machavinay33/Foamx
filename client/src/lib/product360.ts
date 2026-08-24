type Product360Asset = { directory: string; frameCount: number; frameStep: number; extension: 'webp' };

const product360Catalog: Record<string, Product360Asset> = {
  'ceramic-wash': { directory: '/media/product-spin/ceramic-wash', frameCount: 24, frameStep: 2, extension: 'webp' },
  'foam-shampoo': { directory: '/media/product-spin/foam-shampoo', frameCount: 24, frameStep: 2, extension: 'webp' },
};

export const getProduct360Frames = (slug: string): string[] => {
  const product = product360Catalog[slug];
  if (!product) return [];
  const displayFrameCount = Math.ceil(product.frameCount / product.frameStep);
  return Array.from({ length: displayFrameCount }, (_, index) => `${product.directory}/${String(index * product.frameStep + 1).padStart(2, '0')}.${product.extension}`);
};
