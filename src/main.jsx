import { createRoot } from 'react-dom/client';
import '../data.js';
import '../books/library.js';
import '../books/zones.js';
import '../books/activities.js';
import '../books/audio-urdu3.js';
import '../styles.css';

const root = createRoot(document.getElementById('root'));
root.render(<p role="status">Loading interactive books…</p>);

async function startApp() {
  await Promise.all([
    import('../books/activities-english3.js'),
    import('../books/activities-computer0.js'),
    import('../books/activities-maxford.js'),
    import('../books/activities-maths3.js'),
    import('../books/activities-urdu3.js')
  ]);
  const { App } = await import('./App.jsx');
  root.render(<App />);
}

startApp().catch(error => {
  console.error('Could not load the interactive book data.', error);
  root.render(<p role="alert">Could not load the book data. Refresh the page or check the network connection.</p>);
});
