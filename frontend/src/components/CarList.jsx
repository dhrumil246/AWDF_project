import CarCard from './CarCard';

function CarList({ cars }) {
  return (
    <section className="section">
      <h2>Cars ({cars.length})</h2>
      <div className="grid">
        {cars.map((car) => (
          <CarCard key={car.id} car={car} />
        ))}
      </div>
    </section>
  );
}

export default CarList;
