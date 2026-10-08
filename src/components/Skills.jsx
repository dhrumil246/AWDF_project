function Skills({ skillList }) {
  return (
    <section id="skills" className="section">
      <h2>Skills</h2>
      <ul className="skills">
        {skillList.map((s) => (
          <li key={s}>{s}</li>
        ))}
      </ul>
    </section>
  );
}

export default Skills;
