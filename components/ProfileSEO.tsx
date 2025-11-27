import React from 'react';
import { Helmet } from 'react-helmet-async';
import { APP_DOMAIN } from '../constants';

import { Sketch } from '../types';
import { generateSketchSlug } from '../utils/urlHelpers';

interface ProfileSEOProps {
  profileId: string;
  name: string;
  photo?: string;
  sketchCount?: number;
  sketches?: Sketch[];
  dataReady: boolean;
}

export const ProfileSEO: React.FC<ProfileSEOProps> = ({ profileId, name, photo, sketchCount, sketches = [], dataReady }) => {
  // Fallback: If we have basic profile data (name) but "loading" is stuck, force render
  // This ensures something shows up eventually even if the full gallery fetch is slow/failed.
  const shouldRenderSchema = dataReady || (name !== "Bible Sketch User");

  // Debug log to verify Schema updates
  console.log(`[ProfileSEO] Rendering schema for ${name}. Sketch count: ${sketches.length}. Ready: ${dataReady}. ShouldRender: ${shouldRenderSchema}`);

  const url = `${APP_DOMAIN}/profile/${profileId}`;
  const title = `${name}'s Bible Coloring Pages | Bible Sketch Gallery`;
  const description = `Browse ${name}'s collection of Bible coloring pages. Free printable Christian coloring sheets created with Bible Sketch.`;
  const image = photo || `${APP_DOMAIN}/logo.png`;

  const creativeWorks = sketches.map(sketch => {
    const slug = generateSketchSlug(sketch);
    const sketchUrl = `${APP_DOMAIN}/coloring-page/${slug}/${sketch.id}`;
    
    return {
      "@type": "VisualArtwork",
      "name": sketch.promptData ? `${sketch.promptData.book} ${sketch.promptData.chapter}` : "Bible Sketch",
      "image": sketch.imageUrl,
      "url": sketchUrl,
      "datePublished": new Date(sketch.timestamp || Date.now()).toISOString(),
      "author": {
        "@type": "Person",
        "name": name,
        "url": url
      }
    };
  });

  const schemaData = {
    "@context": "https://schema.org",
    "@type": "ProfilePage",
    "mainEntity": {
      "@type": "Person",
      "name": name,
      "image": image,
      "url": url,
      "interactionStatistic": [
        {
          "@type": "InteractionCounter",
          "interactionType": "https://schema.org/WriteAction",
          "userInteractionCount": sketchCount || 0
        }
      ],
      "hasPart": creativeWorks.length > 0 ? {
        "@type": "ItemList",
        "itemListElement": creativeWorks.map((work, index) => ({
          "@type": "ListItem",
          "position": index + 1,
          "item": work
        }))
      } : undefined
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
      <meta property="og:image" content={image} />
      <meta property="og:url" content={url} />
      <meta property="og:type" content="profile" />
      <meta property="profile:username" content={name} />

      {/* Twitter */}
      <meta name="twitter:card" content="summary" />
      <meta name="twitter:title" content={title} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={image} />

      {shouldRenderSchema && (
        <script type="application/ld+json" key={`schema-${profileId}-${sketches.length}`}>
          {JSON.stringify(schemaData)}
        </script>
      )}
    </Helmet>
  );
};

