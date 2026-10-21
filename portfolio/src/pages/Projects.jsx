import { useEffect, useState } from 'react';
import ProjectList from '../components/Projects';
import Spinner from '../components/Spinner';
import ErrorMessage from '../components/ErrorMessage';
import RepoList from '../components/RepoList';

const GITHUB_USER = 'dhrumil246';
const REPOS_URL = `https://api.github.com/users/${GITHUB_USER}/repos?sort=updated&per_page=30`;

function Projects({ projects }) {
  const [repos, setRepos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [search, setSearch] = useState('');

  // Fetch once on mount ([] deps) and again when "Try again" bumps reloadKey.
  // AbortController cancels the request if the user leaves the page first.
  useEffect(() => {
    const controller = new AbortController();

    async function load() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(REPOS_URL, { signal: controller.signal });
        if (!res.ok) throw new Error(`GitHub responded ${res.status}`);
        setRepos(await res.json());
      } catch (err) {
        if (err.name !== 'AbortError') setError(err.message);
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }

    load();
    return () => controller.abort();
  }, [reloadKey]);

  const query = search.trim().toLowerCase();
  const filtered = repos.filter((r) => r.name.toLowerCase().includes(query));

  return (
    <>
      <ProjectList projects={projects} />

      <section className="section">
        <h2>On GitHub</h2>
        <div>
          <p className="lede">
            Live from the GitHub API: public repositories of{' '}
            <a href={`https://github.com/${GITHUB_USER}`} target="_blank" rel="noreferrer">
              @{GITHUB_USER}
            </a>
            , most recently updated first.
          </p>

          {loading && <Spinner label="Loading repositories…" />}
          {!loading && error && <ErrorMessage message={error} onRetry={() => setReloadKey((k) => k + 1)} />}
          {!loading && !error && (
            <>
              <input
                className="input search"
                type="search"
                placeholder="Search repositories"
                aria-label="Search repositories"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              <p className="muted count">
                {filtered.length} of {repos.length} repositories
              </p>
              <RepoList repos={filtered} />
            </>
          )}
        </div>
      </section>
    </>
  );
}

export default Projects;
