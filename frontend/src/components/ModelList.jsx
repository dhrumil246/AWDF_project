import { useEffect, useState } from 'react';
import { getModelsForMake } from '../api/nhtsa';
import Spinner from './Spinner';
import ErrorMessage from './ErrorMessage';

function ModelList({ make }) {
  const [models, setModels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [reloadKey, setReloadKey] = useState(0);

  // Re-runs whenever the selected make changes (or Retry is clicked).
  useEffect(() => {
    const controller = new AbortController();

    async function load() {
      setLoading(true);
      setError(null);
      try {
        const results = await getModelsForMake(make, controller.signal);
        setModels(results);
      } catch (err) {
        if (err.name !== 'AbortError') setError(err.message);
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }

    load();
    return () => controller.abort();
  }, [make, reloadKey]);

  if (loading) return <Spinner label={`Loading ${make} models...`} />;
  if (error) return <ErrorMessage message={error} onRetry={() => setReloadKey((k) => k + 1)} />;

  return (
    <div>
      <h3>
        {make} models ({models.length})
      </h3>
      <ul className="chips">
        {models.map((m) => (
          <li key={m.Model_ID}>{m.Model_Name}</li>
        ))}
      </ul>
    </div>
  );
}

export default ModelList;
