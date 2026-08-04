"use client";

import Script from "next/script";
import { useEffect, useState } from "react";
import { canUseAnalyticsCookies } from "@/lib/cookie-consent";

const gtmId = process.env.NEXT_PUBLIC_GTM_ID?.trim() || "";
const ga4Id = process.env.NEXT_PUBLIC_GA4_ID?.trim() || "";
const metaPixelId = process.env.NEXT_PUBLIC_META_PIXEL_ID?.trim() || "";

export default function MarketingScripts() {
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    setEnabled(canUseAnalyticsCookies());
    const update = () => setEnabled(canUseAnalyticsCookies());
    window.addEventListener("lethela:cookie-consent-changed", update);
    return () => window.removeEventListener("lethela:cookie-consent-changed", update);
  }, []);

  if (!enabled) return null;

  return (
    <>
      {gtmId ? (
        <Script
          id="gtm-init"
          strategy="lazyOnload"
          dangerouslySetInnerHTML={{
            __html: `
              window.dataLayer = window.dataLayer || [];
              window.dataLayer.push({'gtm.start': new Date().getTime(), event: 'gtm.js'});
              (function(w,d,s,l,i){
                var f=d.getElementsByTagName(s)[0],j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';
                j.async=true;j.src='https://www.googletagmanager.com/gtm.js?id='+i+dl;
                f.parentNode.insertBefore(j,f);
              })(window,document,'script','dataLayer','${gtmId}');
            `,
          }}
        />
      ) : null}

      {!gtmId && ga4Id ? (
        <>
          <Script
            src={`https://www.googletagmanager.com/gtag/js?id=${ga4Id}`}
            strategy="lazyOnload"
          />
          <Script
            id="ga4-init"
            strategy="lazyOnload"
            dangerouslySetInnerHTML={{
              __html: `
                window.dataLayer = window.dataLayer || [];
                function gtag(){dataLayer.push(arguments);}
                gtag('js', new Date());
                gtag('config', '${ga4Id}', { send_page_view: true, transport_type: 'beacon' });
              `,
            }}
          />
        </>
      ) : null}

      {metaPixelId ? (
        <Script
          id="meta-pixel"
          strategy="lazyOnload"
          dangerouslySetInnerHTML={{
            __html: `
              !function(f,b,e,v,n,t,s)
              {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
              n.callMethod.apply(n,arguments):n.queue.push(arguments)};
              if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
              n.queue=[];t=b.createElement(e);t.async=!0;
              t.src=v;s=b.getElementsByTagName(e)[0];
              s.parentNode.insertBefore(t,s)}(window, document,'script',
              'https://connect.facebook.net/en_US/fbevents.js');
              fbq('init', '${metaPixelId}');
              fbq('track', 'PageView');
            `,
          }}
        />
      ) : null}
    </>
  );
}
