function SideDetails({ flip = false }) {
  return <svg className={`learning-scene-side${flip ? ' right' : ''}`} viewBox="0 0 84 640" fill="none">
    <path d="m34 90 5 11 12 2-9 8 2 12-10-6-11 6 2-12-9-8 13-2 5-11Z" fill="#ffce49" />
    <path d="m55 219 4 8 9 2-7 6 1 9-7-4-8 4 2-9-7-6 9-2 4-8Z" fill="#f9a08d" />
    <path d="m19 333 5-8 5 8 8 5-8 5-5 8-5-8-8-5 8-5Z" fill="#35b8b0" />
    <circle cx="51" cy="420" r="5" fill="#9cded4" />
    <path d="M15 156c50 14 48 63 13 93s-11 61 22 76M56 474c-35 14-30 46-10 70" stroke="#eecb6d" strokeWidth="2" strokeLinecap="round" strokeDasharray="5 9" />
    <path d="M27 638c-8-35-1-68 16-93m-13 56c-24-3-32-17-26-25 14-8 26 8 26 25Zm2-11c-1-24 8-42 20-35 9 10-4 28-20 35Zm-6 33c-24-1-31-10-26-20 12-8 25 4 26 20Zm3-12c12-19 28-27 34-16 4 12-15 18-34 16Z" fill="#89cfae" />
  </svg>;
}

export function LearningScenery() {
  return <div className="learning-scenery" aria-hidden="true"><SideDetails /><SideDetails flip /></div>;
}

export function LearningLandscape() {
  return <svg className="learning-landscape" viewBox="0 0 1200 130" fill="none" aria-hidden="true" focusable="false">
    <path d="M0 94Q110 33 282 98L383 130H0V94Z" fill="#d8edb4" />
    <path d="M1200 85Q1071 41 932 97L832 130h368V85Z" fill="#d8edb4" />
    <path d="M0 113q118-44 268 17H0v-17Zm1200-8q-120-32-242 25h242v-25Z" fill="#b9db91" />
    <g transform="translate(40 55) rotate(-5)">
      <rect x="0" y="36" width="110" height="23" rx="7" fill="#22b8b0" /><path d="M14 42h90v11H14" fill="#fff7df" />
      <rect x="18" y="13" width="99" height="23" rx="7" fill="#ffcb4a" /><path d="M30 19h82v11H30" fill="#fff7df" />
      <rect x="9" y="-10" width="103" height="23" rx="7" fill="#f48e78" /><path d="M23-4h84v11H23" fill="#fff7df" />
    </g>
    <g transform="translate(1000 45) rotate(5)">
      <path d="M0 14q44-19 83 0 39-19 83 0l-8 59q-43-13-75 0-32-13-75 0L0 14Z" fill="#008c88" />
      <path d="M4 8q44-19 79 2 36-21 79-2l-7 57q-41-13-72 2-32-15-71-2L4 8Z" fill="#fff8df" stroke="#f6bc61" strokeWidth="2" />
      <path d="M83 10v57M22 23q23-6 44 4M23 36q23-6 43 4m37-13q21-10 42-4m-42 17q21-10 41-4" stroke="#ebc58a" strokeWidth="2" strokeLinecap="round" />
    </g>
    <path d="M315 84c80-69 102 64 181-3S612 110 693 69s113 49 179 1" stroke="#efc44d" strokeWidth="2" strokeDasharray="7 9" strokeLinecap="round" />
    <path d="m292 64 4 9 10 1-7 7 1 10-8-5-9 5 2-10-7-7 10-1 4-9Zm611-25 3 7 8 1-6 6 2 8-7-4-7 4 1-8-6-6 9-1 3-7Z" fill="#ffcc48" />
    <circle cx="214" cy="92" r="6" fill="#79cbc2" /><circle cx="936" cy="62" r="5" fill="#f69b84" />
    <path d="M1172 115q-6-35 11-61m-8 40q-26-8-20-22 14-5 20 22Zm3-13q-1-25 13-24 10 12-13 24Z" fill="#62bb96" />
  </svg>;
}
