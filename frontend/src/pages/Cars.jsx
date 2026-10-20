import CarList from '../components/CarList';
import Spinner from '../components/Spinner';
import ErrorMessage from '../components/ErrorMessage';

function Cars({ cars, loading, error, onRetry, onToggleStatus, onDelete }) {
  if (loading) return <Spinner label="Loading cars..." />;
  if (error) return <ErrorMessage message={error} onRetry={onRetry} />;
  return <CarList cars={cars} onToggleStatus={onToggleStatus} onDelete={onDelete} />;
}

export default Cars;
