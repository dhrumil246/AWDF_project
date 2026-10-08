import { Link } from 'react-router-dom';

function NotFound() {
  return (
    <section className="section">
      <h2>404 – Page not found</h2>
      <p>The page you are looking for does not exist.</p>
      <Link to="/">Back to home</Link>
    </section>
  );
}

export default NotFound;
