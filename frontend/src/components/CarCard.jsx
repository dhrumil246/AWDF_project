const formatPrice = (price) => `₹${price.toLocaleString('en-IN')}`;

function CarCard({ car }) {
  return (
    <article className="card">
      <div className="card-head">
        <h3>
          {car.make} {car.model}
        </h3>
        <span className={`badge badge-${car.status}`}>{car.status}</span>
      </div>
      <p className="price">{formatPrice(car.price)}</p>
      <ul className="specs">
        <li>{car.year}</li>
        <li>{car.fuelType}</li>
        <li>{car.transmission}</li>
      </ul>
    </article>
  );
}

export default CarCard;
