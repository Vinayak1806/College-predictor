export function BrandMark({ className = "h-10 w-10" }) {
  return (
    <span className={`inline-flex shrink-0 overflow-hidden rounded-lg shadow-sm ${className}`} aria-hidden="true">
      <img className="h-full w-full" src="/admission-compass-mark.svg" alt="" />
    </span>
  );
}
