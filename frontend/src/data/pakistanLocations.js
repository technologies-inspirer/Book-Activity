export const pakistanRegions = [
  { code: '04', name: 'Punjab' },
  { code: '05', name: 'Sindh' },
  { code: '03', name: 'Khyber Pakhtunkhwa' },
  { code: '02', name: 'Balochistan' },
  { code: '08', name: 'Islamabad Capital Territory' },
  { code: '06', name: 'Azad Jammu and Kashmir' },
  { code: '07', name: 'Gilgit-Baltistan' }
];

export function regionName(value) {
  const aliases = { kpk: 'Khyber Pakhtunkhwa', kp: 'Khyber Pakhtunkhwa', ajk: 'Azad Jammu and Kashmir', islamabad: 'Islamabad Capital Territory', gb: 'Gilgit-Baltistan' };
  const text = String(value || '').trim();
  return pakistanRegions.find(item => item.name.toLowerCase() === text.toLowerCase())?.name || aliases[text.toLowerCase()] || text;
}
