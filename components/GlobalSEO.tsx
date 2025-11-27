import React from 'react';
import { Helmet } from 'react-helmet-async';
import { APP_DOMAIN } from '../constants';

export const GlobalSEO = () => {
  const schemaData = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebSite",
        "url": APP_DOMAIN,
        "name": "Bible Sketch",
        "description": "Create AI-generated Bible coloring pages. Free printable Bible art for Sunday School, VBS, and family devotionals.",
        "potentialAction": {
          "@type": "SearchAction",
          "target": `${APP_DOMAIN}/gallery?search={search_term_string}`,
          "query-input": "required name=search_term_string"
        }
      },
      {
        "@type": "Organization",
        "url": APP_DOMAIN,
        "name": "Bible Sketch",
        "logo": `${APP_DOMAIN}/logo.png`
      }
    ]
  };

  return (
    <Helmet>
      <title>Bible Sketch - Create Custom Bible Coloring Pages | Free Printable Christian Coloring Sheets</title>
      <meta name="description" content="Create free printable Bible coloring pages using AI. Custom Bible illustrations for Sunday School, VBS, and homeschool. Download high-quality Christian line art." />
      <meta name="keywords" content="Bible coloring pages, AI Bible art, Christian coloring sheets, Sunday School resources, printable Bible stories, religious art generator" />
      
      {/* Open Graph / Facebook */}
      <meta property="og:type" content="website" />
      <meta property="og:url" content={APP_DOMAIN} />
      <meta property="og:title" content="Bible Sketch - AI Bible Coloring Pages" />
      <meta property="og:description" content="Create custom Bible coloring pages with AI. Free printable Christian art for kids and adults." />
      <meta property="og:image" content={`${APP_DOMAIN}/logo.png`} />

      {/* Twitter */}
      <meta property="twitter:card" content="summary_large_image" />
      <meta property="twitter:url" content={APP_DOMAIN} />
      <meta property="twitter:title" content="Bible Sketch - AI Bible Coloring Pages" />
      <meta property="twitter:description" content="Create custom Bible coloring pages with AI. Free printable Christian art for kids and adults." />
      <meta property="twitter:image" content={`${APP_DOMAIN}/logo.png`} />

      <script type="application/ld+json">
        {JSON.stringify(schemaData)}
      </script>
    </Helmet>
  );
};

