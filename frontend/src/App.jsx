import { useState } from 'react';
import { Routes, Route } from 'react-router-dom';
import Header from './components/Header';
import NavBar from './components/NavBar';
import Footer from './components/Footer';
import Home from './pages/Home';
import Cars from './pages/Cars';
import AddCar from './pages/AddCar';
import initialCars from './data/cars';
import './App.css';

const APP_NAME = 'Car Details Management System';

const navLinks = [
  { to: '/', label: 'Home' },
  { to: '/cars', label: 'Cars' },
  { to: '/add', label: 'Add Car' },
];

function App() {
  const [cars, setCars] = useState(initialCars);

  const addCar = (car) => {
    setCars((prev) => [...prev, { ...car, id: Date.now() }]);
  };

  return (
    <>
      <Header title={APP_NAME} subtitle="Browse and manage car inventory details" />
      <NavBar links={navLinks} />
      <main className="container">
        <Routes>
          <Route path="/" element={<Home cars={cars} />} />
          <Route path="/cars" element={<Cars cars={cars} />} />
          <Route path="/add" element={<AddCar onAdd={addCar} />} />
        </Routes>
      </main>
      <Footer appName={APP_NAME} />
    </>
  );
}

export default App;
