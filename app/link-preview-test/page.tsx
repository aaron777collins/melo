"use client";

import React from 'react';
import { LinkPreview } from '@/components/chat/link-preview';

export default function LinkPreviewTest() {
  const testUrls = [
    'https://github.com',
    'https://nextjs.org',
    'https://vercel.com',
    'https://example.com/nonexistent',
  ];

  return (
    <div className="p-8 max-w-2xl mx-auto space-y-8">
      <h1 className="text-2xl font-bold">Link Preview Test</h1>
      
      <div className="space-y-4">
        <h2 className="text-lg font-semibold">Card Variant</h2>
        {testUrls.map((url) => (
          <LinkPreview
            key={url}
            url={url}
            variant="card"
          />
        ))}
      </div>

      <div className="space-y-4">
        <h2 className="text-lg font-semibold">Inline Variant</h2>
        {testUrls.map((url) => (
          <div key={url}>
            <p className="text-sm text-muted-foreground mb-2">URL: {url}</p>
            <LinkPreview
              url={url}
              variant="inline"
            />
          </div>
        ))}
      </div>

      <div className="space-y-4">
        <h2 className="text-lg font-semibold">In Message Context</h2>
        <div className="p-4 border rounded-lg bg-muted/50">
          <p className="mb-2">Check out this awesome tool: https://github.com</p>
          <LinkPreview url="https://github.com" variant="card" />
        </div>
      </div>
    </div>
  );
}