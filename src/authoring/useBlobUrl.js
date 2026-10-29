import { createElement, useEffect, useState } from 'react';

export function useBlobUrl(blob) {
  const [url, setUrl] = useState('');
  useEffect(() => {
    if (!blob) { setUrl(''); return; }
    const next = URL.createObjectURL(blob); setUrl(next);
    return () => URL.revokeObjectURL(next);
  }, [blob]);
  return url;
}

export function BlobImage({ blob, ...props }) {
  const url = useBlobUrl(blob);
  return url ? createElement('img', { src: url, ...props }) : null;
}
