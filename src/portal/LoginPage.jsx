import { useState } from 'react';
import { DEMO_CREDENTIALS } from './demoStore.js';
import loginLearningBooks from '../../assets/login-learning-books.png';
import { useDemo } from './DemoContext.jsx';
import { Feedback, Logo, PasswordField } from './Shared.jsx';
import { DashboardAmbient } from './DashboardAmbient.jsx';

export function LoginPage() {
  const { store } = useDemo();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState(null);
  const submit = event => {
    event.preventDefault();
    try {
      const role = store.signIn(email, password);
      setPassword('');
      location.hash = role === 'admin' ? '#/admin/overview' : '#/user/books';
    } catch (error) { setMessage({ error: true, text: error.message }); setPassword(''); }
  };
  return <div className="portal login-screen"><DashboardAmbient /><div className="login-top"><Logo /></div><main className="login-layout"><section className="login-story"><p className="portal-eyebrow">Interactive digital books</p><h1>Learning that<br /><em>comes alive.</em></h1><p className="login-description">Open a book. Discover a new world. Read, listen, play and create with a library made for curious young minds.</p><div className="login-artwork"><img src={loginLearningBooks} alt="Colourful English, Urdu and Maths learning books for young children" width="1672" height="849" fetchPriority="high" /></div><p className="login-caption">Big discoveries start with a little curiosity.</p></section><section className="login-panel portal-panel" aria-labelledby="login-heading"><span className="portal-pill">Your learning space</span><h2 id="login-heading">Welcome back</h2><p className="portal-muted">Sign in to explore your books and resources.</p><form onSubmit={submit}><label className="portal-field" htmlFor="login-email">Email<input id="login-email" name="email" type="email" autoComplete="username" value={email} onChange={event => setEmail(event.target.value)} required placeholder="you@example.com" /></label><PasswordField id="login-password" value={password} onChange={setPassword} autoComplete="current-password" minLength={1} /><Feedback message={message} /><button className="portal-primary full" type="submit">Sign in <span aria-hidden="true">→</span></button></form><p className="login-help">Need an account or password reset?<br />Contact your administrator.</p><div className="demo-credentials"><h3>Start exploring</h3><div className="credential-row"><b>Reader</b><span>{DEMO_CREDENTIALS.user.email}</span><code>{DEMO_CREDENTIALS.user.password}</code></div></div></section></main></div>;
}
