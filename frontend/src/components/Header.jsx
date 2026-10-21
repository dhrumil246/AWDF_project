import { Link } from 'react-router-dom';

function Header({ title, subtitle }) {
  return (
    <header className="header">
      <Link to="/" className="wordmark">
        <span className="wordmark-title">{title}</span>
        <span className="wordmark-subtitle">{subtitle}</span>
      </Link>
    </header>
  );
}

export default Header;
