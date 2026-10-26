import { resourceLinks } from '../data/resourceLinks.js';

function ResourceIcon({ type }) {
  const paths = {
    dropbox: <><path d="M3 7h7l2 2h9v11H3V7Z" /><path d="M3 7V4h7l2 3h7v2" /></>,
    'paper-maker': <><path d="M6 3h8l4 4v14H6V3Z" /><path d="M14 3v5h4M9 12h6M9 16h6" /></>,
    'resources-app': <><rect x="3" y="3" width="7" height="7" rx="1.5" /><rect x="14" y="3" width="7" height="7" rx="1.5" /><rect x="3" y="14" width="7" height="7" rx="1.5" /><rect x="14" y="14" width="7" height="7" rx="1.5" /></>
  };
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[type]}</svg>;
}

export function ResourceOptions({ showHeading = true }) {
  return (
    <section className="dashboard-resources" aria-label="Learning resources">
      {showHeading && <div className="portal-page-heading"><h2>Resources</h2><p className="portal-muted">Useful links for your teaching and learning.</p></div>}
      <div className="resource-option-grid">
        {resourceLinks.map(resource => {
          const available = /^https?:\/\//i.test(resource.url);
          const content = <>
            <span className="resource-option-icon"><ResourceIcon type={resource.id} /></span>
            <h3>{resource.title}</h3>
            <p>{resource.description}</p>
            <span className="resource-option-status">{available ? 'Open resource ↗' : 'Link coming soon'}</span>
          </>;
          return available
            ? <a className="resource-option-card" key={resource.id} href={resource.url} target="_blank" rel="noopener noreferrer">{content}</a>
            : <article className="resource-option-card pending" key={resource.id}>{content}</article>;
        })}
      </div>
    </section>
  );
}
