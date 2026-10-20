import { useCallback, useEffect, useState } from 'react';
import { Routes, Route } from 'react-router-dom';
import Header from './components/Header';
import NavBar from './components/NavBar';
import Footer from './components/Footer';
import Notice from './components/Notice';
import Home from './pages/Home';
import Cars from './pages/Cars';
import AddCar from './pages/AddCar';
import EditCar from './pages/EditCar';
import Catalog from './pages/Catalog';
import NotFound from './pages/NotFound';
import { getCars, createCar, updateCar, deleteCar } from './api/cars';
import './App.css';

const APP_NAME = 'Car Details Management System';

const navLinks = [
  { to: '/', label: 'Home' },
  { to: '/cars', label: 'Cars' },
  { to: '/add', label: 'Add Car' },
  { to: '/catalog', label: 'Catalog' },
];

function App() {
  const [cars, setCars] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [notice, setNotice] = useState(null);

  // Stable reference so Notice's useEffect does not restart its timer on every render.
  const clearNotice = useCallback(() => setNotice(null), []);
  const retry = () => setReloadKey((k) => k + 1);

  // Load cars from the backend on mount (and on Retry).
  useEffect(() => {
    const controller = new AbortController();

    async function load() {
      setLoading(true);
      setError(null);
      try {
        setCars(await getCars(controller.signal));
      } catch (err) {
        if (err.name !== 'AbortError') setError(err.message);
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }

    load();
    return () => controller.abort();
  }, [reloadKey]);

  // Every write updates local state from the server's response, never by
  // assuming success. Create/edit errors are re-thrown so CarForm can show
  // field messages; status/delete errors are shown as an error toast.

  const handleAdd = async (car) => {
    const created = await createCar(car);
    setCars((prev) => [created, ...prev]);
    setNotice({ type: 'success', message: `${created.make} ${created.model} added.` });
  };

  const handleUpdate = async (id, changes) => {
    const updated = await updateCar(id, changes);
    setCars((prev) => prev.map((c) => (c.id === id ? updated : c)));
    setNotice({ type: 'success', message: `${updated.make} ${updated.model} updated.` });
  };

  const handleToggleStatus = async (car) => {
    try {
      const status = car.status === 'available' ? 'sold' : 'available';
      const updated = await updateCar(car.id, { status });
      setCars((prev) => prev.map((c) => (c.id === car.id ? updated : c)));
      setNotice({ type: 'success', message: `${updated.make} ${updated.model} marked ${status}.` });
    } catch (err) {
      setNotice({ type: 'error', message: `Could not update status: ${err.message}` });
    }
  };

  const handleDelete = async (id) => {
    try {
      const { car } = await deleteCar(id);
      setCars((prev) => prev.filter((c) => c.id !== id));
      setNotice({ type: 'success', message: `${car.make} ${car.model} deleted.` });
    } catch (err) {
      setNotice({ type: 'error', message: `Could not delete car: ${err.message}` });
    }
  };

  const carsProps = { cars, loading, error, onRetry: retry };

  return (
    <>
      <Header title={APP_NAME} subtitle="Browse and manage car inventory details" />
      <NavBar links={navLinks} />
      <main className="container">
        <Notice notice={notice} onClose={clearNotice} />
        <Routes>
          <Route path="/" element={<Home {...carsProps} />} />
          <Route
            path="/cars"
            element={<Cars {...carsProps} onToggleStatus={handleToggleStatus} onDelete={handleDelete} />}
          />
          <Route path="/cars/:id/edit" element={<EditCar cars={cars} loading={loading} onUpdate={handleUpdate} />} />
          <Route path="/add" element={<AddCar onAdd={handleAdd} />} />
          <Route path="/catalog" element={<Catalog />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </main>
      <Footer appName={APP_NAME} />
    </>
  );
}

export default App;
