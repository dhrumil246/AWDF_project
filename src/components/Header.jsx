function Header({ name, role, themeColor = '#2563eb' }) {
  return (
    <header className="header" style={{ backgroundColor: themeColor }}>
      <h1>{name}</h1>
      <p>{role}</p>
    </header>
  );
}

export default Header;
