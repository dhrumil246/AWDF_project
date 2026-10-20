import { useState } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

function Login() {
  const { user, notice, login, register } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [mode, setMode] = useState('login'); // 'login' | 'register'
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  if (user) return <Navigate to="/cars" replace />;

  const isRegister = mode === 'register';
  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      if (isRegister) await register(form.name, form.email, form.password);
      else await login(form.email, form.password);
      navigate(location.state?.from || '/cars', { replace: true });
    } catch (err) {
      setError(err);
      setSubmitting(false);
    }
  };

  return (
    <section className="section auth">
      <form className="form" onSubmit={handleSubmit}>
        <h2>{isRegister ? 'Create an account' : 'Log in'}</h2>

        {notice && !error && <p className="notice notice-error">{notice}</p>}
        {error && (
          <div className="error" role="alert">
            <p>{error.message}</p>
            {error.details && (
              <ul>
                {Object.entries(error.details).map(([field, msg]) => (
                  <li key={field}>{msg}</li>
                ))}
              </ul>
            )}
          </div>
        )}

        {isRegister && (
          <label>
            Name
            <input name="name" value={form.name} onChange={handleChange} autoComplete="name" required />
          </label>
        )}
        <label>
          Email
          <input name="email" type="email" value={form.email} onChange={handleChange} autoComplete="email" required />
        </label>
        <label>
          Password
          <input
            name="password"
            type="password"
            value={form.password}
            onChange={handleChange}
            minLength={isRegister ? 8 : undefined}
            autoComplete={isRegister ? 'new-password' : 'current-password'}
            required
          />
        </label>

        <button type="submit" className="button" disabled={submitting}>
          {submitting ? 'Please wait...' : isRegister ? 'Register' : 'Log in'}
        </button>

        <p className="muted">
          {isRegister ? 'Already have an account? ' : 'New here? '}
          <button
            type="button"
            className="link-button"
            onClick={() => {
              setMode(isRegister ? 'login' : 'register');
              setError(null);
            }}
          >
            {isRegister ? 'Log in' : 'Create an account'}
          </button>
        </p>
      </form>
    </section>
  );
}

export default Login;
