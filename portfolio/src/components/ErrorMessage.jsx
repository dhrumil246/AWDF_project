function ErrorMessage({ message, onRetry }) {
  return (
    <div className="error" role="alert">
      <p>Could not load repositories: {message}</p>
      {onRetry && (
        <button type="button" className="pill-button" onClick={onRetry}>
          Try again
        </button>
      )}
    </div>
  );
}

export default ErrorMessage;
