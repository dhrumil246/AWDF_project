import { NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

function NavBar({ links }) {
  const { user, logout } = useAuth();

  return (
    <nav className="navbar" aria-label="Main">
      <div className="navbar-links">
        {links.map((link) => (
          <NavLink key={link.to} to={link.to} end>
            {link.label}
          </NavLink>
        ))}
      </div>
      <span className="navbar-user">
        {user ? (
          <>
            <span className="navbar-name">{user.name}</span>
            <button type="button" className="action action-quiet" onClick={logout}>
              Log out
            </button>
          </>
        ) : (
          <NavLink to="/login">Log in</NavLink>
        )}
      </span>
    </nav>
  );
}

export default NavBar;
