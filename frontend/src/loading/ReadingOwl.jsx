import { useId } from 'react';

// Animate the original PNG in place; the character is never replaced or redrawn.
export function ReadingOwl() {
  const id = useId().replace(/[^a-zA-Z0-9_-]/g, '');
  const source = `${import.meta.env.BASE_URL}assets/loading-owl.png`;
  return <svg className="book-loading-reader" viewBox="0 0 1316 1195" aria-hidden="true" focusable="false">
    <defs>
      <clipPath id={`${id}-eyes`}>
        <ellipse cx="527" cy="650" rx="87" ry="72" />
        <ellipse cx="800" cy="650" rx="87" ry="72" />
      </clipPath>
      <clipPath id={`${id}-page`}>
        <path d="M657 832Q716 792 792 777L784 1006 657 1056Z" />
      </clipPath>
      <clipPath id={`${id}-reading-area`}>
        <path d="M475 813Q540 829 612 868L612 1008 484 958Z" />
        <path d="M690 853Q733 824 779 816L777 988 690 1025Z" />
      </clipPath>
      <linearGradient id={`${id}-lid`} x1="0" y1="0" x2="0" y2="1">
        <stop stopColor="#349ce3" /><stop offset="1" stopColor="#2c91d7" />
      </linearGradient>
      <linearGradient id={`${id}-paper`}>
        <stop stopColor="#fffdf7" stopOpacity=".92" /><stop offset="1" stopColor="#e7e7e7" stopOpacity=".2" />
      </linearGradient>
    </defs>
    <image href={source} width="1316" height="1195" />
    <g clipPath={`url(#${id}-eyes)`}>
      <image className="book-owl-pupils" href={source} width="1316" height="1195" />
      <g className="book-owl-lids" fill={`url(#${id}-lid)`}>
        <ellipse cx="527" cy="650" rx="96" ry="82" />
        <ellipse cx="800" cy="650" rx="96" ry="82" />
      </g>
    </g>
    <g clipPath={`url(#${id}-reading-area)`}>
      <g className="book-owl-reading-lines" stroke="#7b9299" strokeWidth="5" strokeLinecap="round" fill="none">
        {Array.from({ length: 11 }, (_, index) => {
          const y = 820 + index * 26;
          return <path key={index} d={`M491 ${y}q54 14 105 40M698 ${y + 32}q34-22 67-28`} />;
        })}
      </g>
    </g>
    <g clipPath={`url(#${id}-page)`}>
      <path className="book-owl-page" d="M657 832Q720 778 790 778L784 1006Q715 1025 657 1056Z" fill={`url(#${id}-paper)`} stroke="#fff" strokeOpacity=".4" strokeWidth="2" />
    </g>
  </svg>;
}
