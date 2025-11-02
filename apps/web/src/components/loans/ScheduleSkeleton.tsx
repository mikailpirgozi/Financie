export function ScheduleSkeleton(): React.JSX.Element {
  return (
    <div className="space-y-2">
      <div className="h-10 bg-muted animate-pulse rounded" />
      {Array.from({ length: 10 }).map((_, i) => (
        <div key={i} className="h-12 bg-muted/50 animate-pulse rounded" />
      ))}
    </div>
  );
}
