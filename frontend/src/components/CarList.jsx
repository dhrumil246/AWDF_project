import CarCard from './CarCard';

function CarList({ cars, onToggleStatus, onDelete }) {
  return (
    <section className="section">
      <h2>Cars ({cars.length})</h2>
      {cars.length === 0 && <p className="muted">No cars yet. Add the first one.</p>}
      <div className="grid">
        {cars.map((car) => (
          <CarCard key={car.id} car={car} onToggleStatus={onToggleStatus} onDelete={onDelete} />
        ))}
      </div>
    </section>
  );
}

export default CarList;
