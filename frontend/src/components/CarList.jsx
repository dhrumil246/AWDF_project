import CarCard from './CarCard';

function CarList({ cars, onToggleStatus, onDelete }) {
  return (
    <section className="section">
      <div className="page-head">
        <h2>Inventory</h2>
        <p className="muted">{cars.length} cars</p>
      </div>
      {cars.length === 0 && <p className="muted">No cars yet. Add the first one from “Add a car”.</p>}
      <div className="grid">
        {cars.map((car) => (
          <CarCard key={car.id} car={car} onToggleStatus={onToggleStatus} onDelete={onDelete} />
        ))}
      </div>
    </section>
  );
}

export default CarList;
