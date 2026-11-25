import { createRoot } from 'react-dom/client';
import { LoadingScreen } from './loading/LoadingScreen.jsx';
import '../data.js';
import '../books/library.js';
import '../books/zones.js';
import '../books/activities.js';
import '../books/audio-urdu3.js';
import '../styles.css';
import './theme.css';
import { registerPwa } from './pwa/install.js';

registerPwa();

const root = createRoot(document.getElementById('root'));
root.render(<LoadingScreen />);

async function startApp() {
  const minimumStartup = new Promise(resolve => setTimeout(resolve, 1000));   // the owl shows briefly, not for long
  await Promise.all([
    import('../books/activities-english3.js'),
    import('../books/activities-computer0.js'),
    import('../books/activities-maxford.js'),
    import('../books/activities-maths3.js'),
    import('../books/activities-urdu3.js'),
    import('../books/activities-urdu4.js'),
    import('../books/activities-english4.js'),
    import('../books/activities-maths4.js'),
    import('../books/activities-maths5.js'),
    import('../books/activities-english5.js'),
    import('../books/activities-urdu5.js'),
    import('../books/activities-urdu1.js'),
    import('../books/activities-sst1.js'),
    import('../books/activities-sci1.js'),
    import('../books/activities-maths1.js'),
    import('../books/activities-eng1.js'),
    import('../books/activities-isl1.js'),
    import('../books/activities-eng2.js'),
    import('../books/activities-maths2.js'),
    import('../books/activities-comp2.js'),
    import('../books/activities-sst2.js'),
    import('../books/game-crops.js'),
    import('../books/questions.js')
  ]);
  const { App } = await import('./App.jsx');
  await minimumStartup;
  root.render(<App />);
}

startApp().catch(error => {
  console.error('Could not load the interactive book data.', error);
  root.render(<p role="alert">Could not load the book data. Refresh the page or check the network connection.</p>);
});
