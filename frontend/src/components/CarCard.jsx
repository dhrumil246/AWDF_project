import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const formatPrice = (price) => `₹${price.toLocaleString('en-IN')}`;

// onToggleStatus / onDelete are optional: the live preview renders without them.
function CarCard({ car, onToggleStatus, onDelete }) {
  const [showDetails, setShowDetails] = useState(false);
  const [busy, setBusy] = useState(false);
  const { user } = useAuth();
  const canEdit = Boolean(onDelete && user && car.owner?.id === user.id);

  const run = async (action) => {
    setBusy(true);
    await action();
    setBusy(false);
  };

  const handleDelete = () => {
    if (window.confirm(`Delete ${car.make} ${car.model}? This cannot be undone.`)) {
      run(() => onDelete(car.id));
    }
  };

  return (
    <article className="card">
      <div className="card-head">
        <h3>
          {car.make} {car.model}
        </h3>
        <span className={`badge badge-${car.status}`}>{car.status}</span>
      </div>
      <p className="price">{formatPrice(car.price)}</p>
      {car.owner?.name && <p className="owner">Listed by {car.owner.id === user?.id ? 'you' : car.owner.name}</p>}
      <button type="button" className="link-button" onClick={() => setShowDetails(!showDetails)}>
        {showDetails ? 'Hide details' : 'Show details'}
      </button>
      {showDetails && (
        <>
          <ul className="specs">
            <li>{car.year}</li>
            <li>{car.fuelType}</li>
            <li>{car.transmission}</li>
            {car.registrationNumber && <li>{car.registrationNumber}</li>}
          </ul>
          {car.description && <p className="description">{car.description}</p>}
        </>
      )}

      {canEdit && (
        <div className="card-actions">
          <Link to={`/cars/${car.id}/edit`} className="action">
            Edit
          </Link>
          <button type="button" className="action" disabled={busy} onClick={() => run(() => onToggleStatus(car))}>
            Mark {car.status === 'available' ? 'sold' : 'available'}
          </button>
          <button type="button" className="action action-danger" disabled={busy} onClick={handleDelete}>
            Delete
          </button>
        </div>
      )}
    </article>
  );
}

export default CarCard;
