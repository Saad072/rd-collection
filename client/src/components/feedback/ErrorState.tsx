interface ErrorStateProps {
  message: string;
  onRetry?: () => void;
}

export default function ErrorState({ message, onRetry }: ErrorStateProps) {
  return (
    <div className="text-center py-10 px-6" role="alert">
      <h3 className="text-lg mb-2">Something went wrong</h3>
      <p className="text-sm text-muted mb-6">{message}</p>
      {onRetry && (
        <button type="button" onClick={onRetry} className="btn btn-outline">
          Try Again
        </button>
      )}
    </div>
  );
}
