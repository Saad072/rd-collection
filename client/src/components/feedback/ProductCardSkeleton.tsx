export function ProductCardSkeleton() {
  return (
    <div className="flex flex-col animate-pulse" aria-hidden="true">
      <div className="aspect-[3/4] bg-paper" />
      <div className="pt-3 space-y-2">
        <div className="h-3.5 bg-paper w-11/12" />
        <div className="h-3.5 bg-paper w-2/3" />
        <div className="h-4 bg-paper w-1/3" />
      </div>
    </div>
  );
}

export function ProductGridSkeleton({ count = 8 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-x-3 gap-y-8 md:gap-x-4">
      {Array.from({ length: count }, (_, i) => (
        <ProductCardSkeleton key={i} />
      ))}
    </div>
  );
}
