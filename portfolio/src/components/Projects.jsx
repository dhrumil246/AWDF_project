function Projects({ projects }) {
  return (
    <section id="projects" className="section">
      <h2>Projects</h2>
      <ol className="projects">
        {projects.map((p) => (
          <li key={p.title} className="project">
            <h3>{p.title}</h3>
            <p className="project-description">{p.description}</p>
            <p className="project-tech">{p.tech}</p>
          </li>
        ))}
      </ol>
    </section>
  );
}

export default Projects;
