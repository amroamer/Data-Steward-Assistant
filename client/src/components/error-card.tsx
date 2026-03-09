export function ErrorCard({
  message,
  onRetry,
  retryLabel = "Try Again",
}: {
  message: string;
  onRetry: () => void;
  retryLabel?: string;
}) {
  return (
    <div
      className="rounded-xl p-4 flex items-start gap-4"
      style={{ backgroundColor: "#FFEBEE", borderLeft: "4px solid #C62828" }}
      data-testid="error-card"
    >
      <span className="text-2xl flex-shrink-0 leading-none mt-0.5">❌</span>
      <div className="flex-1 min-w-0">
        <p className="text-sm text-red-900 leading-relaxed mb-3">{message}</p>
        <button
          onClick={onRetry}
          className="inline-flex items-center px-4 py-1.5 rounded-lg text-white text-xs font-semibold transition-opacity hover:opacity-90"
          style={{ backgroundColor: "#C62828" }}
          data-testid="button-error-retry"
        >
          {retryLabel}
        </button>
      </div>
    </div>
  );
}
