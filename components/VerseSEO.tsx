import React from 'react';
import { Helmet } from 'react-helmet-async';
import { APP_DOMAIN } from '../constants';

export const VerseSEO = () => {
  const pageUrl = `${APP_DOMAIN}/bible-verse-coloring`;
  
  const schemaData = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    "url": pageUrl,
    "name": "Bible Verse Coloring Pages Generator",
    "description": "Create beautiful Bible verse coloring pages with decorative typography. Choose from elegant script, modern brush, playful, or classic serif font styles.",
    "isPartOf": {
      "@type": "WebSite",
      "url": APP_DOMAIN,
      "name": "Bible Sketch"
    },
    "mainEntity": {
      "@type": "SoftwareApplication",
      "name": "Bible Verse Coloring Page Generator",
      "applicationCategory": "DesignApplication",
      "operatingSystem": "Web Browser",
      "offers": {
        "@type": "Offer",
        "price": "0",
        "priceCurrency": "USD"
      }
    }
  };

  return (
    <Helmet>
      <title>Bible Verse Coloring Pages | Create Custom Scripture Art | Bible Sketch</title>
      <meta name="description" content="Turn any Bible verse into a beautiful coloring page. Choose from elegant script, modern brush, playful, or classic serif typography styles. Free printable scripture art." />
      <meta name="keywords" content="Bible verse coloring pages, scripture coloring pages, printable Bible verses, Christian coloring sheets, verse art, Bible journaling, hand lettered scripture, typography coloring" />
      
      <link rel="canonical" href={pageUrl} />

      {/* Open Graph / Facebook */}
      <meta property="og:type" content="website" />
      <meta property="og:url" content={pageUrl} />
      <meta property="og:title" content="Bible Verse Coloring Pages | Create Custom Scripture Art" />
      <meta property="og:description" content="Turn any Bible verse into a beautiful coloring page. Choose from elegant script, modern brush, playful, or classic serif typography styles." />
      <meta property="og:image" content={`${APP_DOMAIN}/logo.png`} />

      {/* Twitter */}
      <meta property="twitter:card" content="summary_large_image" />
      <meta property="twitter:url" content={pageUrl} />
      <meta property="twitter:title" content="Bible Verse Coloring Pages | Create Custom Scripture Art" />
      <meta property="twitter:description" content="Turn any Bible verse into a beautiful coloring page. Choose from elegant script, modern brush, playful, or classic serif typography styles." />
      <meta property="twitter:image" content={`${APP_DOMAIN}/logo.png`} />

      <script type="application/ld+json">
        {JSON.stringify(schemaData)}
      </script>
    </Helmet>
  );
};

