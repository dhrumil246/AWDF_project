import { useCallback, useState } from 'react';
import { Routes, Route } from 'react-router-dom';
import Header from './components/Header';
import NavBar from './components/NavBar';
import Footer from './components/Footer';
import Notice from './components/Notice';
import Home from './pages/Home';
import Cars from './pages/Cars';
import AddCar from './pages/AddCar';
import Catalog from './pages/Catalog';
import NotFound from './pages/NotFound';
import initialCars from './data/cars';
import './App.css';

const APP_NAME = 'Car Details Management System';

const navLinks = [
  { to: '/', label: 'Home' },
  { to: '/cars', label: 'Cars' },
  { to: '/add', label: 'Add Car' },
  { to: '/catalog', label: 'Catalog' },
];

function App() {
  const [cars, setCars] = useState(initialCars);
  const [notice, setNotice] = useState('');

  // Stable reference so Notice's useEffect does not restart its timer on every render.
  const clearNotice = useCallback(() => setNotice(''), []);

  const addCar = (car) => {
    setCars((prev) => [...prev, { ...car, id: Date.now() }]);
    setNotice(`${car.make} ${car.model} added to inventory.`);
  };

  return (
    <>
      <Header title={APP_NAME} subtitle="Browse and manage car inventory details" />
      <NavBar links={navLinks} />
      <main className="container">
        <Notice message={notice} onClose={clearNotice} />
        <Routes>
          <Route path="/" element={<Home cars={cars} />} />
          <Route path="/cars" element={<Cars cars={cars} />} />
          <Route path="/add" element={<AddCar onAdd={addCar} />} />
          <Route path="/catalog" element={<Catalog />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </main>
      <Footer appName={APP_NAME} />
    </>
  );
}

export default App;
