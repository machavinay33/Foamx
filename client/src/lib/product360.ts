const product360Catalog: Record<string, { directory: string; frameCount: number }> = {
  'ceramic-wash': { directory: '/media/product-spin/ceramic-wash', frameCount: 24 },
  'foam-shampoo': { directory: '/media/product-spin/foam-shampoo', frameCount: 24 },
};

export const getProduct360Frames = (slug: string): string[] => {
  const product = product360Catalog[slug];
  if (!product) return [];
  return Array.from({ length: product.frameCount }, (_, index) => `${product.directory}/${String(index + 1).padStart(2, '0')}.png`);
};
