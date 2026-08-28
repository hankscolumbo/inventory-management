// components/SafeHtml.tsx
'use client';

import { useEffect, useState } from 'react';

interface Props {
  html: string;
  className?: string;
}

export default function SafeHtml({ html, className }: Props) {
  const [sanitizedHtml, setSanitizedHtml] = useState<string>('');

  useEffect(() => {
    import('dompurify').then((DOMPurify) => {
      setSanitizedHtml(DOMPurify.default.sanitize(html));
    });
  }, [html]);

  // Render container once sanitized on the client
  if (!sanitizedHtml) {
    return <div className={className} />;
  }

  return (
    <div
      className={className}
      dangerouslySetInnerHTML={{ __html: sanitizedHtml }}
    />
  );
}