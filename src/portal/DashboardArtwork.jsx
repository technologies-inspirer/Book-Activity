import artwork from '../../assets/user-dashboard-storybook.png';

// Fixed view boxes show only decorative artwork; all labels and links stay live.
const regions = {
  welcome: '865 94 630 212',
  library: '900 338 493 167',
  dropbox: '350 713 140 107',
  'paper-maker': '704 715 125 105',
  'resources-app': '1035 710 136 110',
  'school-management': '1385 703 126 117',
  landscape: '0 837 1672 104'
};

export function DashboardArtwork({ variant }) {
  const [, , width, height] = regions[variant].split(' ').map(Number);
  return <svg className={`dashboard-artwork dashboard-artwork-${variant}`} viewBox={regions[variant]} width={width} height={height} preserveAspectRatio={variant === 'landscape' ? 'xMidYMin slice' : 'xMidYMid meet'} fill="none" aria-hidden="true" focusable="false"><image href={artwork} x="0" y="0" width="1672" height="941" /></svg>;
}
