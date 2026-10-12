import { useEffect, useState } from 'react';
import { getCarMakes } from '../api/nhtsa';
import Spinner from '../components/Spinner';
import ErrorMessage from '../components/ErrorMessage';
import ModelList from '../components/ModelList';

function Catalog() {
  const [makes, setMakes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [search, setSearch] = useState('');
  const [selectedMake, setSelectedMake] = useState(null);

  // Fetch once on mount ([] deps) and again only when Retry bumps reloadKey.
  // The AbortController cancels the request if the user leaves the page,
  // so state is never set on an unmounted component.
  useEffect(() => {
    const controller = new AbortController();

    async function load() {
      setLoading(true);
      setError(null);
      try {
        const results = await getCarMakes(controller.signal);
        setMakes(results.sort((a, b) => a.MakeName.localeCompare(b.MakeName)));
      } catch (err) {
        if (err.name !== 'AbortError') setError(err.message);
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }

    load();
    return () => controller.abort();
  }, [reloadKey]);

  if (loading) return <Spinner label="Loading car makes..." />;
  if (error) return <ErrorMessage message={error} onRetry={() => setReloadKey((k) => k + 1)} />;

  const filtered = makes.filter((m) => m.MakeName.toLowerCase().includes(search.trim().toLowerCase()));

  return (
    <section className="section">
      <h2>Car catalog</h2>
      <p className="muted">
        Live data from the public{' '}
        <a href="https://vpic.nhtsa.dot.gov/api/" target="_blank" rel="noreferrer">
          NHTSA vPIC API
        </a>
        . Pick a make to load its models.
      </p>

      <input
        className="search"
        type="search"
        placeholder="Search makes..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        aria-label="Search makes"
      />
      <p className="muted">
        Showing {filtered.length} of {makes.length} makes
      </p>

      <ul className="chips">
        {filtered.map((m) => (
          <li key={m.MakeId}>
            <button
              type="button"
              className={m.MakeName === selectedMake ? 'chip-button selected' : 'chip-button'}
              onClick={() => setSelectedMake(m.MakeName)}
            >
              {m.MakeName}
            </button>
          </li>
        ))}
      </ul>

      {selectedMake && (
        <div className="models">
          <ModelList make={selectedMake} />
        </div>
      )}
    </section>
  );
}

export default Catalog;
