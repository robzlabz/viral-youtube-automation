export default function NotFound() {
  return (
    <div className="flex min-h-full flex-1 items-center justify-center">
      <div className="flex flex-col items-center gap-4 text-center">
        <h2 className="text-2xl font-semibold text-foreground">Not Found</h2>
        <p className="text-sm text-muted-foreground">
          The page you are looking for does not exist.
        </p>
        <a
          href="/"
          className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary-hover"
        >
          Go home
        </a>
      </div>
    </div>
  );
}
