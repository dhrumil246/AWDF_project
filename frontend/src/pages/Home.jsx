import { Link } from 'react-router-dom';
import Spinner from '../components/Spinner';
import ErrorMessage from '../components/ErrorMessage';

const formatPrice = (price) => `₹${price.toLocaleString('en-IN')}`;

function Home({ cars, loading, error, onRetry }) {
  if (loading) return <Spinner label="Loading inventory..." />;
  if (error) return <ErrorMessage message={error} onRetry={onRetry} />;

  const available = cars.filter((c) => c.status === 'available').length;
  const sold = cars.length - available;
  const availableShare = cars.length ? (available / cars.length) * 100 : 0;
  const recent = cars.slice(0, 5); // the API returns newest first

  if (cars.length === 0) {
    return (
      <section className="section overview">
        <h2 className="overview-title">The lot is empty</h2>
        <p className="muted">Add your first car to start tracking inventory.</p>
        <Link to="/add" className="button">
          Add a car
        </Link>
      </section>
    );
  }

  return (
    <section className="section overview">
      <h2 className="overview-title">{cars.length} cars on the lot</h2>

      <div
        className="lot-bar"
        role="img"
        aria-label={`${available} available, ${sold} sold`}
        style={{ '--available': `${availableShare}%` }}
      />
      <ul className="lot-legend">
        <li className="legend-available">
          <strong>{available}</strong> available
        </li>
        <li className="legend-sold">
          <strong>{sold}</strong> sold
        </li>
      </ul>

      <div className="overview-actions">
        <Link to="/add" className="button">
          Add a car
        </Link>
        <Link to="/cars" className="button button-secondary">
          Browse inventory
        </Link>
      </div>

      <h3 className="recent-title">Recently listed</h3>
      <ul className="recent">
        {recent.map((car) => (
          <li key={car.id}>
            <span className="recent-name">
              {car.make} <strong>{car.model}</strong>
            </span>
            <span className="recent-year">{car.year}</span>
            <span className={`status status-${car.status}`}>{car.status === 'sold' ? 'Sold' : 'Available'}</span>
            <span className="recent-price">{formatPrice(car.price)}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}

export default Home;
