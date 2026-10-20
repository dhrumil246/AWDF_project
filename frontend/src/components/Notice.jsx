import { useEffect } from 'react';

// Toast shown after each create/update/delete. notice = { type: 'success' | 'error', message }
function Notice({ notice, onClose }) {
  // Auto-dismiss after 3 seconds. The cleanup clears the timer if the
  // notice is closed manually or replaced before it fires.
  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(onClose, 3000);
    return () => clearTimeout(timer);
  }, [notice, onClose]);

  if (!notice) return null;

  return (
    <div className={`notice notice-${notice.type}`} role="status">
      {notice.message}
      <button type="button" className="notice-close" onClick={onClose} aria-label="Dismiss">
        ×
      </button>
    </div>
  );
}

export default Notice;
