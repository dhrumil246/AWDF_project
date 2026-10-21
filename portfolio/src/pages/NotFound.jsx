import { Link } from 'react-router-dom';

function NotFound() {
  return (
    <section className="section">
      <h2>Not found</h2>
      <div>
        <p className="lede">There is no page at this address.</p>
        <Link to="/">Go to the home page</Link>
      </div>
    </section>
  );
}

export default NotFound;
