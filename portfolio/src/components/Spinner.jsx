function Spinner({ label = 'Loading…' }) {
  return (
    <p className="spinner" role="status">
      <span className="spinner-dot" aria-hidden="true" />
      {label}
    </p>
  );
}

export default Spinner;
