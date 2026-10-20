import { lazy, Suspense, useCallback, useEffect, useState } from 'react';
import { Routes, Route } from 'react-router-dom';
import Header from './components/Header';
import NavBar from './components/NavBar';
import Footer from './components/Footer';
import Notice from './components/Notice';
import Spinner from './components/Spinner';
import ProtectedRoute from './components/ProtectedRoute';
import Home from './pages/Home';
import { useAuth } from './context/AuthContext';
import { getCars, createCar, updateCar, patchCar, deleteCar } from './api/cars';
import './App.css';

// Route-based code splitting: each page below becomes its own chunk that is
// downloaded only when its route is first visited. Home stays in the main
// bundle because it is the landing page.
const Cars = lazy(() => import('./pages/Cars'));
const AddCar = lazy(() => import('./pages/AddCar'));
const EditCar = lazy(() => import('./pages/EditCar'));
const Catalog = lazy(() => import('./pages/Catalog'));
const Login = lazy(() => import('./pages/Login'));
const NotFound = lazy(() => import('./pages/NotFound'));

const APP_NAME = 'Car Details Management System';

const navLinks = [
  { to: '/', label: 'Home' },
  { to: '/cars', label: 'Cars' },
  { to: '/add', label: 'Add Car' },
  { to: '/catalog', label: 'Catalog' },
];

function App() {
  const { user } = useAuth();
  const userId = user?.id;
  const [cars, setCars] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [notice, setNotice] = useState(null);

  // Stable reference so Notice's useEffect does not restart its timer on every render.
  const clearNotice = useCallback(() => setNotice(null), []);
  const retry = () => setReloadKey((k) => k + 1);

  // Load cars from the backend when a user is logged in (and on Retry).
  useEffect(() => {
    if (!userId) return;
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
  }, [reloadKey, userId]);

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

  // useCallback keeps these references stable between renders so memo(CarCard)
  // can skip cards whose car did not change. They only use functional state
  // updates, so they have no dependencies.
  const handleToggleStatus = useCallback(async (car) => {
    try {
      const status = car.status === 'available' ? 'sold' : 'available';
      const updated = await patchCar(car.id, { status });
      setCars((prev) => prev.map((c) => (c.id === car.id ? updated : c)));
      setNotice({ type: 'success', message: `${updated.make} ${updated.model} marked ${status}.` });
    } catch (err) {
      setNotice({ type: 'error', message: `Could not update status: ${err.message}` });
    }
  }, []);

  const handleDelete = useCallback(async (id) => {
    try {
      const { car } = await deleteCar(id);
      setCars((prev) => prev.filter((c) => c.id !== id));
      setNotice({ type: 'success', message: `${car.make} ${car.model} deleted.` });
    } catch (err) {
      setNotice({ type: 'error', message: `Could not delete car: ${err.message}` });
    }
  }, []);

  // After logout, never show the previous user's data.
  const visibleCars = userId ? cars : [];
  const carsProps = { cars: visibleCars, loading, error, onRetry: retry };

  return (
    <>
      <Header title={APP_NAME} subtitle="Browse and manage car inventory details" />
      <NavBar links={navLinks} />
      <main className="container">
        <Notice notice={notice} onClose={clearNotice} />
        <Suspense fallback={<Spinner label="Loading page..." />}>
          <Routes>
            <Route
              path="/"
              element={
                <ProtectedRoute>
                  <Home {...carsProps} />
                </ProtectedRoute>
              }
            />
            <Route
              path="/cars"
              element={
                <ProtectedRoute>
                  <Cars {...carsProps} onToggleStatus={handleToggleStatus} onDelete={handleDelete} />
                </ProtectedRoute>
              }
            />
            <Route
              path="/cars/:id/edit"
              element={
                <ProtectedRoute>
                  <EditCar cars={visibleCars} loading={loading} onUpdate={handleUpdate} />
                </ProtectedRoute>
              }
            />
            <Route
              path="/add"
              element={
                <ProtectedRoute>
                  <AddCar onAdd={handleAdd} />
                </ProtectedRoute>
              }
            />
            <Route path="/login" element={<Login />} />
            <Route path="/catalog" element={<Catalog />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Suspense>
      </main>
      <Footer appName={APP_NAME} />
    </>
  );
}

export default App;
