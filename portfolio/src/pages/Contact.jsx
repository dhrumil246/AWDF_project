import { useEffect, useState } from 'react';

const MAX_LENGTH = 300;

function Contact({ email }) {
  const [message, setMessage] = useState('');
  const [showHelp, setShowHelp] = useState(false);

  // Hide the help text automatically after 3 seconds; clear the timer if
  // the user closes it first or leaves the page.
  useEffect(() => {
    if (!showHelp) return;
    const timer = setTimeout(() => setShowHelp(false), 3000);
    return () => clearTimeout(timer);
  }, [showHelp]);

  return (
    <section className="section">
      <h2>Contact</h2>
      <p>
        Email me at <a href={`mailto:${email}`}>{email}</a> or leave a message below.
      </p>

      <label htmlFor="message" className="label">
        Message{' '}
        <button type="button" className="help-toggle" onClick={() => setShowHelp(!showHelp)}>
          {showHelp ? 'Hide help' : 'Help'}
        </button>
      </label>
      {showHelp && <p className="help">Write a short message, up to {MAX_LENGTH} characters.</p>}

      <textarea
        id="message"
        className="input"
        rows={4}
        maxLength={MAX_LENGTH}
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        placeholder="Type your message..."
      />
      <p className="char-count">
        {message.length} / {MAX_LENGTH}
      </p>

      <h3>Live preview</h3>
      <p className="preview">{message || 'Nothing typed yet.'}</p>
    </section>
  );
}

export default Contact;
