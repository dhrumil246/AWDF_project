import { useLocation } from 'react-router-dom';

// On the home page the name is the hero; elsewhere it is a smaller title.
// themeColor sets the accent colour used for the name and links.
function Header({ name, role, themeColor = '#2340c8' }) {
  const { pathname } = useLocation();
  const isHome = pathname === '/';

  return (
    <header className={isHome ? 'header header-hero' : 'header'} style={{ '--theme': themeColor }}>
      <h1 className="name">
        {name.split(' ').map((part) => (
          <span key={part}>{part}</span>
        ))}
      </h1>
      <p className="role">{role}</p>
    </header>
  );
}

export default Header;
