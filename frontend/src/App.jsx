import Header from './components/Header';
import CarList from './components/CarList';
import Footer from './components/Footer';
import cars from './data/cars';
import './App.css';

const APP_NAME = 'Car Details Management System';

function App() {
  return (
    <>
      <Header title={APP_NAME} subtitle="Browse and manage car inventory details" />
      <main className="container">
        <CarList cars={cars} />
      </main>
      <Footer appName={APP_NAME} />
    </>
  );
}

export default App;
