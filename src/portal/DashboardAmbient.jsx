function Butterfly() {
  return <svg className="dashboard-butterfly" viewBox="0 0 100 90" fill="none" focusable="false">
    <g className="dashboard-butterfly-wings"><path d="M49 41C24-11-10 5 13 44c-27 31 13 57 36 8Z" fill="#69cfc8" /><path d="M51 41C76-11 110 5 87 44c27 31-13 57-36 8Z" fill="#ffcf77" /><path d="M28 27 39 38M72 27 61 38" stroke="#fff8" strokeWidth="6" strokeLinecap="round" /></g>
    <path d="M50 30v34m-1-34-8-10m10 10 8-10" stroke="#43847b" strokeWidth="5" strokeLinecap="round" />
  </svg>;
}

function Cloud() {
  return <svg className="dashboard-cloud" viewBox="0 0 160 80" fill="none" focusable="false"><path d="M31 68C-4 68 0 30 29 29 36-4 85-5 96 25c35-11 66 13 50 33-5 7-15 10-29 10H31Z" fill="#fffaf0" stroke="#eedec4" strokeWidth="2" /><path d="M34 60h87" stroke="#f8eed9" strokeWidth="4" strokeLinecap="round" /></svg>;
}

function Star() {
  return <svg className="dashboard-floating-star" viewBox="0 0 80 80" fill="none" focusable="false"><path d="m40 7 10 21 24 4-17 17 4 24-21-11-21 11 4-24L6 32l24-4L40 7Z" fill="#ffd65c" stroke="#ffedb1" strokeWidth="3" /><path d="M31 39v3m18-3v3m-17 9q8 7 16 0" stroke="#8a793e" strokeWidth="3" strokeLinecap="round" /></svg>;
}

export function DashboardAmbient() {
  return <div className="dashboard-ambient" aria-hidden="true">{['left', 'right'].map(side => <div className={`dashboard-ambient-side ${side}`} key={side}>
    <Cloud /><Star /><Butterfly />
    <svg className="dashboard-drift-trail" viewBox="0 0 100 260" fill="none" focusable="false"><path d="M24 6c87 62-80 79 27 144s-37 61-17 101" stroke="#e9c96f" strokeWidth="2" strokeDasharray="5 12" strokeLinecap="round" /><circle cx="29" cy="96" r="5" fill="#f7bca5" /><circle cx="71" cy="194" r="5" fill="#9eddd1" /></svg>
  </div>)}</div>;
}
