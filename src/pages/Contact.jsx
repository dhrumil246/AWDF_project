function Contact({ email }) {
  return (
    <section className="section">
      <h2>Contact</h2>
      <p>
        Email me at <a href={`mailto:${email}`}>{email}</a>.
      </p>
    </section>
  );
}

export default Contact;
