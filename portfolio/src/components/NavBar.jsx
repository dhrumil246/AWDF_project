import { NavLink } from 'react-router-dom';

function NavBar({ links, children }) {
  return (
    <nav className="navbar" aria-label="Main">
      <div className="navbar-links">
        {links.map((link) => (
          <NavLink key={link.to} to={link.to} end>
            {link.label}
          </NavLink>
        ))}
      </div>
      {children}
    </nav>
  );
}

export default NavBar;
