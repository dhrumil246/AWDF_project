import { memo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Plate from './Plate';

const formatPrice = (price) => `₹${price.toLocaleString('en-IN')}`;

// onToggleStatus / onDelete are optional: the live preview renders without them.
function CarCard({ car, onToggleStatus, onDelete }) {
  const [showDetails, setShowDetails] = useState(false);
  const [busy, setBusy] = useState(false);
  const { user } = useAuth();
  const canEdit = Boolean(onDelete && user && car.owner?.id === user.id);
  const sold = car.status === 'sold';

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
    <article className={`card${sold ? ' card-sold' : ''}`}>
      <div className="card-head">
        <div>
          <p className="car-make">{car.make}</p>
          <h3 className="car-model">{car.model}</h3>
        </div>
        <span className={`status status-${car.status}`}>{sold ? 'Sold' : 'Available'}</span>
      </div>

      <ul className="specs" aria-label="Specifications">
        <li>{car.year}</li>
        <li>{car.fuelType}</li>
        <li>{car.transmission}</li>
      </ul>

      <p className="sticker">
        <span className="sticker-label">Asking price</span>
        <span className="price">{formatPrice(car.price)}</span>
      </p>

      <button
        type="button"
        className="link-button"
        aria-expanded={showDetails}
        onClick={() => setShowDetails(!showDetails)}
      >
        {showDetails ? 'Hide details' : 'Show details'}
      </button>
      {showDetails && (
        <div className="details">
          {car.registrationNumber ? <Plate number={car.registrationNumber} /> : <p className="muted">Not registered yet</p>}
          {car.description && <p className="description">{car.description}</p>}
          {car.owner?.name && (
            <p className="owner">Listed by {car.owner.id === user?.id ? 'you' : car.owner.name}</p>
          )}
        </div>
      )}

      {canEdit && (
        <div className="card-actions">
          <Link to={`/cars/${car.id}/edit`} className="action">
            Edit
          </Link>
          <button type="button" className="action" disabled={busy} onClick={() => run(() => onToggleStatus(car))}>
            Mark {sold ? 'available' : 'sold'}
          </button>
          <button type="button" className="action action-danger" disabled={busy} onClick={handleDelete}>
            Delete
          </button>
        </div>
      )}
    </article>
  );
}

// memo: skip re-rendering a card when its props (car, handlers) are unchanged,
// e.g. when only the toast in App changes.
export default memo(CarCard);
