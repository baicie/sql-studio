interface MarketplaceReadmeProps {
  readme?: string;
}

export function MarketplaceReadme(props: MarketplaceReadmeProps) {
  if (!props.readme) {
    return (
      <div className="rounded-md border p-4 text-sm text-muted-foreground">No README provided.</div>
    );
  }

  return (
    <div className="rounded-md border p-4">
      <pre className="whitespace-pre-wrap text-sm leading-6">{props.readme}</pre>
    </div>
  );
}
