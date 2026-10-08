function NavBar({ links }) {
  return (
    <nav className="navbar">
      {links.map((link) => (
        <a key={link.href} href={link.href}>
          {link.label}
        </a>
      ))}
    </nav>
  );
}

export default NavBar;
