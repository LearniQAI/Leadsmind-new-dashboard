import dns from 'dns';

/**
 * SPF/DKIM verification is Resend's job now: sending domains are created in the platform Resend
 * account and Resend's own status is trusted (see sendingDomains.ts). Resend does not check DMARC,
 * so this stays as an advisory check shown next to the domain. It is not a send gate.
 */

export type TxtResolver = (host: string) => Promise<string[]>;

export const systemTxtResolver: TxtResolver = (host) =>
  dns.promises.resolveTxt(host).then((rows) => rows.map((r) => r.join('')), () => []);

/** An enforcing DMARC policy (quarantine or reject) at _dmarc.<domain>. */
export async function checkDmarc(domainName: string, resolveTxt: TxtResolver = systemTxtResolver): Promise<boolean> {
  const records = await resolveTxt(`_dmarc.${domainName.trim().toLowerCase().replace(/\.$/, '')}`);
  const dmarc = records.map((r) => r.replace(/"/g, '')).find((r) => r.trim().startsWith('v=DMARC1'));
  return !!dmarc && /p\s*=\s*(quarantine|reject)/i.test(dmarc);
}
