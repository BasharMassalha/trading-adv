export default function SuperinvestorsLoading() {
  return (
    <div className="space-y-5">
      <div className="space-y-2 pb-1">
        <div className="h-5 w-48 animate-pulse rounded-md bg-muted" />
        <div className="h-3.5 w-full max-w-xl animate-pulse rounded-md bg-muted" />
      </div>

      <div className="hairline-grid grid sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="px-[18px] py-4">
            <div className="h-3 w-24 animate-pulse rounded-md bg-muted" />
            <div className="mt-3 h-5 w-16 animate-pulse rounded-md bg-muted" />
            <div className="mt-2.5 h-3 w-20 animate-pulse rounded-md bg-muted" />
          </div>
        ))}
      </div>

      <p className="text-[12.5px] text-muted-foreground">
        Loading live SEC 13F filings. The first refresh can take up to a minute.
      </p>

      <div className="hairline-grid grid md:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="space-y-2.5 p-5">
            <div className="h-4 w-36 animate-pulse rounded-md bg-muted" />
            <div className="h-3 w-24 animate-pulse rounded-md bg-muted" />
            <div className="h-3 w-full animate-pulse rounded-md bg-muted" />
            <div className="h-3 w-40 animate-pulse rounded-md bg-muted" />
          </div>
        ))}
      </div>
    </div>
  );
}
