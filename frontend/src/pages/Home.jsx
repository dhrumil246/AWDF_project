import { Link } from 'react-router-dom';
import Spinner from '../components/Spinner';
import ErrorMessage from '../components/ErrorMessage';

function Home({ cars, loading, error, onRetry }) {
  if (loading) return <Spinner label="Loading inventory..." />;
  if (error) return <ErrorMessage message={error} onRetry={onRetry} />;

  const available = cars.filter((c) => c.status === 'available').length;

  return (
    <section className="section">
      <h2>Inventory overview</h2>
      <div className="stats">
        <div className="stat">
          <span className="stat-value">{cars.length}</span>
          <span className="stat-label">Total cars</span>
        </div>
        <div className="stat">
          <span className="stat-value">{available}</span>
          <span className="stat-label">Available</span>
        </div>
        <div className="stat">
          <span className="stat-value">{cars.length - available}</span>
          <span className="stat-label">Sold</span>
        </div>
      </div>
      <p>
        <Link to="/cars">View all cars</Link> or <Link to="/add">add a new car</Link>.
      </p>
    </section>
  );
}

export default Home;
