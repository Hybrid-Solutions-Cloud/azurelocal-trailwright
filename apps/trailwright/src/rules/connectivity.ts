import type { Rule } from './types';

const RELEASES = ['2607', '2608', '2609'];
const OUTBOUND_URL = 'https://learn.microsoft.com/azure/azure-local/plan/cloud-deployment-network-considerations?view=azloc-2609#decision-10-determine-outbound-connectivity';
const PRIVATE_PATH_URL = 'https://learn.microsoft.com/azure/azure-local/deploy/deployment-with-azure-arc-gateway-private-path?view=azloc-2609';

const GATEWAY_URL = 'https://learn.microsoft.com/azure/azure-local/deploy/deployment-azure-arc-gateway-overview?view=azloc-2609#supported-and-unsupported-scenarios';

const usesProxy = (path: string): boolean => path === 'proxy' || path === 'proxy-arc-gateway';

export const connectivityRules: Rule[] = [
  {
    id: 'CON-001',
    release: RELEASES,
    learnUrl: OUTBOUND_URL,
    check: (p) =>
      usesProxy(p.connectivity.path) && !p.connectivity.proxyUrl?.trim()
        ? [{ id: 'CON-001', severity: 'error', field: 'connectivity.proxyUrl', message: 'A proxy path needs the proxy server address; it is given once, during Arc registration.', learnUrl: OUTBOUND_URL }]
        : [],
  },
  {
    id: 'CON-002',
    release: RELEASES,
    learnUrl: OUTBOUND_URL,
    check: (p) => {
      const url = p.connectivity.proxyUrl?.trim().toLowerCase();
      if (!url) return [];
      let host = '';
      try {
        host = new URL(url).hostname;
      } catch {
        // an address that is not a URL has no host to check; the PAC test below still applies
      }
      return url.endsWith('.pac') || host.endsWith('.local')
        ? [{ id: 'CON-002', severity: 'error', field: 'connectivity.proxyUrl', message: 'PAC files and proxy addresses on a .local domain are not supported; only non-authenticated proxies are.', learnUrl: OUTBOUND_URL }]
        : [];
    },
  },
  {
    id: 'CON-003',
    release: RELEASES,
    learnUrl: PRIVATE_PATH_URL,
    check: (p) =>
      p.connectivity.path === 'private-path' && p.release.version < '2608'
        ? [{ id: 'CON-003', severity: 'error', field: 'connectivity.path', message: 'The private path network needs Azure Local 2608 or later.', learnUrl: PRIVATE_PATH_URL }]
        : [],
  },
  {
    id: 'CON-004',
    release: RELEASES,
    learnUrl: OUTBOUND_URL,
    check: (p) =>
      p.connectivity.path === 'direct' || p.connectivity.path === 'proxy'
        ? [{ id: 'CON-004', severity: 'info', field: 'connectivity.path', message: 'This path needs more than 100 FQDNs on the perimeter firewall and suits labs; proxy plus Arc gateway is recommended for new public-path production.', learnUrl: OUTBOUND_URL }]
        : [],
  },
  {
    id: 'CON-005',
    release: RELEASES,
    learnUrl: OUTBOUND_URL,
    check: (p) =>
      p.connectivity.path === 'arc-gateway' || p.connectivity.path === 'proxy-arc-gateway'
        ? [{ id: 'CON-005', severity: 'info', field: 'connectivity.path', message: 'About 23 FQDNs remain on the firewall allow list with Arc gateway, and private endpoints are not routed through it.', learnUrl: OUTBOUND_URL }]
        : [],
  },
  {
    id: 'CON-006',
    release: RELEASES,
    learnUrl: PRIVATE_PATH_URL,
    check: (p) =>
      p.connectivity.path === 'private-path' && !p.connectivity.privatePath.transport
        ? [{ id: 'CON-006', severity: 'error', field: 'connectivity.privatePath.transport', message: 'The private path needs an Azure ExpressRoute or site-to-site VPN connection from the site to the Azure virtual network.', learnUrl: PRIVATE_PATH_URL }]
        : [],
  },
  {
    id: 'CON-007',
    release: RELEASES,
    learnUrl: PRIVATE_PATH_URL,
    check: (p) => {
      const pp = p.connectivity.privatePath;
      return p.connectivity.path === 'private-path' && (!pp.firewallPrivateIp.trim() || !pp.firewallPort.trim())
        ? [{ id: 'CON-007', severity: 'error', field: 'connectivity.privatePath.firewallPrivateIp', message: 'The Azure Firewall private IP address and port are the proxy the machines register through; both are needed.', learnUrl: PRIVATE_PATH_URL }]
        : [];
    },
  },
  {
    id: 'CON-008',
    release: RELEASES,
    learnUrl: PRIVATE_PATH_URL,
    check: (p) =>
      p.connectivity.path === 'private-path' && p.connectivity.privatePath.arcPrivateLinkScopeOnNetwork
        ? [{ id: 'CON-008', severity: 'error', field: 'connectivity.privatePath.arcPrivateLinkScopeOnNetwork', message: 'Azure Local does not support an Azure Arc Private Link Scope on the virtual network where Azure Firewall runs as the explicit proxy; use a separate network for workloads that need one.', learnUrl: PRIVATE_PATH_URL }]
        : [],
  },
  {
    id: 'CON-009',
    release: RELEASES,
    learnUrl: GATEWAY_URL,
    check: (p) =>
      (p.connectivity.path === 'arc-gateway' || p.connectivity.path === 'proxy-arc-gateway' || p.connectivity.path === 'private-path') && !p.connectivity.arcGatewayName.trim()
        ? [{ id: 'CON-009', severity: 'warning', field: 'connectivity.arcGatewayName', message: 'Name the Arc gateway resource. It must exist, in the same subscription as the machines, before they register; it cannot be enabled after deployment.', learnUrl: GATEWAY_URL }]
        : [],
  },
  {
    id: 'CON-010',
    release: RELEASES,
    learnUrl: PRIVATE_PATH_URL,
    check: (p) => {
      const bypass = p.connectivity.privatePath.proxyBypass;
      return p.connectivity.path === 'private-path' && (bypass.includes('.svc') || bypass.includes('<local>'))
        ? [{ id: 'CON-010', severity: 'warning', field: 'connectivity.privatePath.proxyBypass', message: "In the proxy bypass list use 'localhost' instead of <local>, and do not include .svc; the registration script handles that.", learnUrl: PRIVATE_PATH_URL }]
        : [];
    },
  },];