export function MarketplaceEmptyState() {
  return (
    <div className="flex h-full items-center justify-center p-6 text-center text-sm text-muted-foreground">
      <div>
        <div className="font-medium text-foreground">No extensions found</div>
        <div className="mt-1">Try changing the search keyword or category.</div>
      </div>
    </div>
  );
}
