const year = new Date().getFullYear();

function Footer({ name, email }) {
  return (
    <footer className="footer">
      <a href={`mailto:${email}`}>{email}</a>
      <p>
        © {year} {name}
      </p>
    </footer>
  );
}

export default Footer;
