function ErrorMessage({ message, onRetry }) {
  return (
    <div className="error" role="alert">
      <p>Something went wrong: {message}</p>
      {onRetry && (
        <button type="button" className="button" onClick={onRetry}>
          Retry
        </button>
      )}
    </div>
  );
}

export default ErrorMessage;
