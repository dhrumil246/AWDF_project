function Projects({ projects }) {
  return (
    <section id="projects" className="section">
      <h2>Projects</h2>
      <div className="cards">
        {projects.map((p) => (
          <article key={p.title} className="card">
            <h3>{p.title}</h3>
            <p>{p.description}</p>
            <small>{p.tech}</small>
          </article>
        ))}
      </div>
    </section>
  );
}

export default Projects;
