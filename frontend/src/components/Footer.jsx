const year = new Date().getFullYear();

function Footer({ appName }) {
  return (
    <footer className="footer">
      <p>
        © {year} {appName}
      </p>
    </footer>
  );
}

export default Footer;
