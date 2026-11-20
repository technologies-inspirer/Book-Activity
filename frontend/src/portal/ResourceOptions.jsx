import { resourceLinks } from '../data/resourceLinks.js';
import { DashboardArtwork } from './DashboardArtwork.jsx';
import folderLogo from '../../assets/resource-folder-logo.png';
import paperMakerLogo from '../../assets/resource-paper-maker-logo.png';
import learnBeeLogo from '../../assets/resource-learnbee-logo.png';
import schoolLogo from '../../assets/resource-school-erp-logo.png';

const resourceLogos = { dropbox: folderLogo, 'paper-maker': paperMakerLogo, 'resources-app': learnBeeLogo, 'school-management': schoolLogo };

function ResourceIcon({ type }) {
  const paths = {
    dropbox: <><path d="M3 7h7l2 2h9v11H3V7Z" /><path d="M3 7V4h7l2 3h7v2" /></>,
    'paper-maker': <><path d="M6 3h8l4 4v14H6V3Z" /><path d="M14 3v5h4M9 12h6M9 16h6" /></>,
    'resources-app': <><rect x="6" y="2" width="12" height="20" rx="3" /><path d="M10 5h4m-3 14h2M9 9h6v6H9Z" /></>,
    'school-management': <><path d="m3 9 9-6 9 6v12H3V9ZM9 21v-6h6v6M7 10h1m8 0h1M7 13h1m8 0h1" /><path d="M12 3v6m0-6h5v3h-5" /></>
  };
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[type]}</svg>;
}

export function ResourceOptions({ showHeading = true, classFolders = false, illustrated = false }) {
  return (
    <section className="dashboard-resources" aria-label="Learning resources">
      {showHeading && <div className="portal-page-heading"><div><h2>Resources</h2><p className="portal-muted">Useful links for your teaching and learning.</p></div>{classFolders && <a className="portal-secondary" href="#/user/resources">View class resources <span aria-hidden="true">&#8594;</span></a>}</div>}
      <div className="resource-option-grid">
        {resourceLinks.map(resource => {
          const internal = classFolders && resource.id === 'dropbox';
          const available = internal || /^https?:\/\//i.test(resource.url);
          const content = <>
            <span className="resource-option-icon">{illustrated ? <img className="resource-brand-logo" src={resourceLogos[resource.id]} alt="" width="40" height="40" /> : <ResourceIcon type={resource.id} />}</span>
            <h3>{resource.title}</h3>
            <p>{resource.description}</p>
            <span className="resource-option-status">{available ? `${resource.action || 'Open resource'} ${internal ? '→' : '↗'}` : 'Link coming soon'}</span>
            {illustrated && <DashboardArtwork variant={resource.id} />}
          </>;
          return available
            ? <a className="resource-option-card" key={resource.id} href={internal ? '#/user/resources' : resource.url} target={internal ? undefined : '_blank'} rel={internal ? undefined : 'noopener noreferrer'}>{content}</a>
            : <article className="resource-option-card pending" key={resource.id}>{content}</article>;
        })}
      </div>
    </section>
  );
}
