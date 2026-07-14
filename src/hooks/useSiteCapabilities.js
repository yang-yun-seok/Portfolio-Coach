import { useEffect, useState } from 'react';
import {
  CHECKING_SITE_CAPABILITIES,
  fetchSiteCapabilities,
} from '../lib/site-capabilities';

const UNAVAILABLE_SITE_CAPABILITIES = Object.freeze({
  portfolioSubmissions: Object.freeze({
    enabled: false,
    status: 'unavailable',
  }),
});

export function useSiteCapabilities() {
  const [capabilities, setCapabilities] = useState(CHECKING_SITE_CAPABILITIES);

  useEffect(() => {
    let active = true;
    fetchSiteCapabilities()
      .then((nextCapabilities) => {
        if (active) setCapabilities(nextCapabilities);
      })
      .catch(() => {
        if (active) setCapabilities(UNAVAILABLE_SITE_CAPABILITIES);
      });

    return () => {
      active = false;
    };
  }, []);

  return capabilities;
}
