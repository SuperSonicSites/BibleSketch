import React, { memo } from 'react';
import { Helmet } from 'react-helmet-async';

interface SketchSEOProps {
  title: string;
  description: string;
  imageUrl?: string;
  url: string;
  // New props for Schema.org
  authorName?: string;
  authorProfileUrl?: string;
  datePublished?: string;
}

export const SketchSEO = memo(({ 
  title, 
  description, 
  imageUrl, 
  url,
  authorName,
  authorProfileUrl,
  datePublished 
}: SketchSEOProps) => {

  // Construct Schema.org JSON-LD
  const schemaData = {
    "@context": "https://schema.org",
    "@type": "CreativeWork", // Or "VisualArtwork" for more specificity
    "name": title,
    "headline": title,
    "description": description,
    "image": imageUrl,
    "url": url,
    "datePublished": datePublished,
    "author": {
      "@type": "Person",
      "name": authorName || "Bible Sketch User",
      "url": authorProfileUrl
    },
    "creator": {
      "@type": "Person",
      "name": authorName || "Bible Sketch User",
      "url": authorProfileUrl
    },
    "copyrightHolder": {
      "@type": "Person",
      "name": authorName || "Bible Sketch User"
    }
  };

  return (
    <Helmet>
      <title>{title}</title>
      <meta name="description" content={description} />
      <link rel="canonical" href={url} />
      
      {/* Open Graph */}
      <meta property="og:title" content={title} />
      <meta property="og:description" content={description} />
      <meta property="og:type" content="article" />
      <meta property="og:site_name" content="Bible Sketch" />
      <meta property="og:url" content={url} />
      {imageUrl && <meta property="og:image" content={imageUrl} />}
      
      {/* Twitter */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={title} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:url" content={url} />
      {imageUrl && <meta name="twitter:image" content={imageUrl} />}

      {/* Schema.org JSON-LD */}
      <script type="application/ld+json">
        {JSON.stringify(schemaData)}
      </script>
    </Helmet>
  );
}, (prevProps, nextProps) => {
  // Custom comparison to be absolutely sure we only re-render on content change
  return (
    prevProps.title === nextProps.title &&
    prevProps.description === nextProps.description &&
    prevProps.imageUrl === nextProps.imageUrl &&
    prevProps.url === nextProps.url &&
    // Add new props to comparison
    prevProps.authorName === nextProps.authorName &&
    prevProps.authorProfileUrl === nextProps.authorProfileUrl
  );
});
