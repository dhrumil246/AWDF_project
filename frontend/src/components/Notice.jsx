import { useEffect } from 'react';

function Notice({ message, onClose }) {
  // Auto-dismiss after 3 seconds. The cleanup clears the timer if the
  // notice is closed manually or replaced before it fires.
  useEffect(() => {
    if (!message) return;
    const timer = setTimeout(onClose, 3000);
    return () => clearTimeout(timer);
  }, [message, onClose]);

  if (!message) return null;

  return (
    <div className="notice" role="status">
      {message}
      <button type="button" className="notice-close" onClick={onClose} aria-label="Dismiss">
        ×
      </button>
    </div>
  );
}

export default Notice;
