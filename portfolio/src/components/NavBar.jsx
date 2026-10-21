import { NavLink } from 'react-router-dom';

function NavBar({ links, children }) {
  return (
    <nav className="navbar">
      {links.map((link) => (
        <NavLink key={link.to} to={link.to} end>
          {link.label}
        </NavLink>
      ))}
      {children}
    </nav>
  );
}

export default NavBar;
