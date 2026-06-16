// src/lib/domains/vercel.ts
// Handles API calls to Vercel Domains API for provisioning client custom domains and SSL.

const VERCEL_API_TOKEN = process.env.VERCEL_API_TOKEN;
const VERCEL_PROJECT_ID = process.env.VERCEL_PROJECT_ID;
const VERCEL_TEAM_ID = process.env.VERCEL_TEAM_ID;

function getUrl(path: string): string {
  const url = new URL(`https://api.vercel.com${path}`);
  if (VERCEL_TEAM_ID) {
    url.searchParams.set('teamId', VERCEL_TEAM_ID);
  }
  return url.toString();
}

function getHeaders() {
  return {
    Authorization: `Bearer ${VERCEL_API_TOKEN}`,
    'Content-Type': 'application/json',
  };
}

/**
 * Adds a domain to the Vercel project.
 */
export async function addDomainToProject(hostname: string) {
  if (!VERCEL_API_TOKEN || !VERCEL_PROJECT_ID) {
    console.warn('[Vercel Domains] VERCEL_API_TOKEN or VERCEL_PROJECT_ID is not set.');
    return { success: false, error: 'Vercel configuration missing' };
  }

  const url = getUrl(`/v10/projects/${VERCEL_PROJECT_ID}/domains`);
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ name: hostname }),
    });

    const data = await res.json();
    if (!res.ok) {
      if (data.error?.code === 'domain_already_exists' || data.error?.code === 'duplicate_domain') {
        return { success: true, alreadyAdded: true, data };
      }
      return { success: false, error: data.error?.message || 'Failed to add domain to project', data };
    }

    return { success: true, alreadyAdded: false, data };
  } catch (error: any) {
    return { success: false, error: error.message || 'Network error adding domain to project' };
  }
}

/**
 * Gets the config and project status of a domain to verify ownership and DNS routing.
 */
export async function getDomainStatus(hostname: string) {
  if (!VERCEL_API_TOKEN || !VERCEL_PROJECT_ID) {
    return { verified: false, error: 'Vercel configuration missing' };
  }

  try {
    // 1. Get Project Domain details (verification status)
    const projectDomainUrl = getUrl(`/v9/projects/${VERCEL_PROJECT_ID}/domains/${hostname}`);
    const projectDomainRes = await fetch(projectDomainUrl, {
      headers: getHeaders(),
    });
    const projectDomainData = await projectDomainRes.json();

    // 2. Get Domain Configuration (DNS mapping state)
    const domainConfigUrl = getUrl(`/v6/domains/${hostname}/config`);
    const domainConfigRes = await fetch(domainConfigUrl, {
      headers: getHeaders(),
    });
    const domainConfigData = await domainConfigRes.json();

    if (!projectDomainRes.ok) {
      return {
        verified: false,
        error: projectDomainData.error?.message || 'Failed to fetch project domain status',
        projectDomainData,
        domainConfigData
      };
    }

    // A domain is ready when verified is true on the project and not misconfigured config-wise
    const verified = !!projectDomainData.verified && !domainConfigData.misconfigured;

    return {
      success: true,
      verified,
      projectDomainData,
      domainConfigData,
    };
  } catch (error: any) {
    return { verified: false, error: error.message || 'Network error getting domain status' };
  }
}

/**
 * Deletes a domain from the Vercel project.
 */
export async function removeDomainFromProject(hostname: string) {
  if (!VERCEL_API_TOKEN || !VERCEL_PROJECT_ID) {
    return { success: false, error: 'Vercel configuration missing' };
  }

  const url = getUrl(`/v9/projects/${VERCEL_PROJECT_ID}/domains/${hostname}`);
  try {
    const res = await fetch(url, {
      method: 'DELETE',
      headers: getHeaders(),
    });

    const data = await res.json();
    if (!res.ok) {
      return { success: false, error: data.error?.message || 'Failed to remove domain from project', data };
    }

    return { success: true, data };
  } catch (error: any) {
    return { success: false, error: error.message || 'Network error removing domain from project' };
  }
}
