import { classResourceLinks } from '../data/resourceLinks.js';
import folderLogo from '../../assets/resource-folder-logo.png';

function ResourceDocumentIcon() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8Z" /><path d="M14 3v5h5M9 13h6M9 17h4" /></svg>;
}

export function ResourceLibrary() {
  return <section className="resource-library" aria-labelledby="resource-library-heading">
    <div className="library-navigation"><a className="library-back-link" href="#/user"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m10 5-7 7 7 7M3 12h18" /></svg>Back to dashboard</a></div>
    <div className="resource-library-panel">
      <header className="resource-library-header">
        <span className="resource-library-heading-icon"><ResourceDocumentIcon /></span>
        <div><p>Javed Publishers</p><h1 id="resource-library-heading">Educational Resources</h1></div>
        <span className="resource-library-count">{classResourceLinks.length} classes</span>
      </header>
      <div className="resource-library-body">
        <p className="resource-library-intro">Choose your class to explore its resource folder.</p>
        <ul className="class-resource-list">
          {classResourceLinks.map(resource => <li key={resource.id}>
            <a className="class-resource-link" href={resource.url} target="_blank" rel="noopener noreferrer" aria-label={`${resource.title} resources — opens resource folder in a new tab`}>
              <span className="class-resource-icon"><img src={folderLogo} alt="" width="44" height="44" /></span>
              <span className="class-resource-copy"><strong>{resource.title} Resources</strong><span>Open resource folder</span></span>
              <span className="class-resource-open" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M14 3h7v7m0-7L10 14M9 5H5a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-4" /></svg></span>
            </a>
          </li>)}
        </ul>
      </div>
    </div>
  </section>;
}
