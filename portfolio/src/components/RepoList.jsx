function RepoList({ repos }) {
  if (repos.length === 0) return <p className="muted">No repositories match that search.</p>;

  return (
    <ul className="repos">
      {repos.map((repo) => (
        <li key={repo.id}>
          <a href={repo.html_url} target="_blank" rel="noreferrer">
            {repo.name}
          </a>
          <span className="repo-meta">
            {repo.language && <span>{repo.language}</span>}
            <span aria-label={`${repo.stargazers_count} stars`}>★ {repo.stargazers_count}</span>
          </span>
        </li>
      ))}
    </ul>
  );
}

export default RepoList;
