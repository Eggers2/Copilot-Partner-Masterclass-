"use client";

import { useEffect, useState } from "react";
import Script from "next/script";

const PARTNER_ID = "9167458";
const ALLOWED_DOMAIN = "copilotberater.de";

export default function LinkedInInsightTag() {
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    const host = window.location.hostname.toLowerCase();
    setEnabled(host === ALLOWED_DOMAIN || host.endsWith(`.${ALLOWED_DOMAIN}`));
  }, []);

  if (!enabled) return null;

  return (
    <>
      <Script id="linkedin-insight-init" strategy="afterInteractive">
        {`_linkedin_partner_id = "${PARTNER_ID}";
window._linkedin_data_partner_ids = window._linkedin_data_partner_ids || [];
window._linkedin_data_partner_ids.push(_linkedin_partner_id);`}
      </Script>
      <Script id="linkedin-insight-loader" strategy="afterInteractive">
        {`(function(l) {
  if (!l){window.lintrk = function(a,b){window.lintrk.q.push([a,b])};
  window.lintrk.q=[]}
  var s = document.getElementsByTagName("script")[0];
  var b = document.createElement("script");
  b.type = "text/javascript";b.async = true;
  b.src = "https://snap.licdn.com/li.lms-analytics/insight.min.js";
  s.parentNode.insertBefore(b, s);})(window.lintrk);`}
      </Script>
    </>
  );
}
