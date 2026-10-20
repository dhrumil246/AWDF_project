import { Link, useNavigate, useParams } from 'react-router-dom';
import CarForm from '../components/CarForm';
import Spinner from '../components/Spinner';
import { useAuth } from '../context/AuthContext';

function EditCar({ cars, loading, onUpdate }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  if (loading) return <Spinner label="Loading car..." />;

  const car = cars.find((c) => c.id === id);
  if (!car) {
    return (
      <section className="section">
        <h2>Car not found</h2>
        <Link to="/cars">Back to cars</Link>
      </section>
    );
  }

  if (car.owner?.id !== user?.id) {
    return (
      <section className="section">
        <h2>Not allowed</h2>
        <p>You can only edit cars you listed.</p>
        <Link to="/cars">Back to cars</Link>
      </section>
    );
  }

  const handleSubmit = async (changes) => {
    await onUpdate(id, changes);
    navigate('/cars');
  };

  return (
    <CarForm
      key={car.id}
      title={`Edit ${car.make} ${car.model}`}
      initialCar={car}
      submitLabel="Save changes"
      onSubmit={handleSubmit}
    />
  );
}

export default EditCar;
