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
      <div>
        <p className="lede">
          Email me at <a href={`mailto:${email}`}>{email}</a>, or draft a message below.
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
          rows={5}
          maxLength={MAX_LENGTH}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Hi Dhrumil, …"
        />
        <p className="char-count">
          {message.length} / {MAX_LENGTH}
        </p>

        <h3 className="subhead">Preview</h3>
        <blockquote className="preview">{message || 'Your message will appear here as you type.'}</blockquote>
      </div>
    </section>
  );
}

export default Contact;
