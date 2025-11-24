import React, { memo } from 'react';
import { Helmet } from 'react-helmet-async';

interface SketchSEOProps {
  title: string;
  description: string;
  imageUrl?: string;
  url: string;
}

export const SketchSEO = memo(({ title, description, imageUrl, url }: SketchSEOProps) => {
  return (
    <Helmet>
      <title>{title}</title>
      <meta name="description" content={description} />
      
      {/* Open Graph */}
      <meta property="og:title" content={title} />
      <meta property="og:description" content={description} />
      <meta property="og:type" content="article" />
      <meta property="og:url" content={url} />
      {imageUrl && <meta property="og:image" content={imageUrl} />}
      
      {/* Twitter */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={title} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:url" content={url} />
      {imageUrl && <meta name="twitter:image" content={imageUrl} />}
    </Helmet>
  );
}, (prevProps, nextProps) => {
  // Custom comparison to be absolutely sure we only re-render on content change
  return (
    prevProps.title === nextProps.title &&
    prevProps.description === nextProps.description &&
    prevProps.imageUrl === nextProps.imageUrl &&
    prevProps.url === nextProps.url
  );
});

