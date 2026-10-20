import { useNavigate } from 'react-router-dom';
import CarForm from '../components/CarForm';

function AddCar({ onAdd }) {
  const navigate = useNavigate();

  const handleSubmit = async (car) => {
    await onAdd(car); // throws on API error, so CarForm can show it
    navigate('/cars');
  };

  return <CarForm title="Add a car" submitLabel="Add car" onSubmit={handleSubmit} />;
}

export default AddCar;
