import type { FC } from 'react';
import { useProjectStore } from '../model/store';
import type { Project } from '../model/schema';
import { ChoiceCards } from '../components/ChoiceCards';
import { SelectInput } from '../components/Field';
import { FindingsPanel } from '../components/FindingsPanel';
import { regionsFor } from '../model/regions';

type Mode = Project['deployment']['mode'];
type Architecture = Project['deployment']['architecture'];
type SanType = Project['deployment']['sanType'];
type Cloud = Project['deployment']['cloud'];

const modeOptions = [
  { value: 'connected', label: 'Connected', description: 'Nodes reach Azure for registration, billing and lifecycle management: over the internet (directly, through a proxy or the Arc gateway) or over a private path.' },
  { value: 'disconnected', label: 'Disconnected (air-gapped)', description: 'Azure Local disconnected operations with a local Autonomous Cloud endpoint. Needs a dedicated three-node management cluster plus one or more workload clusters.' },
];

const architectureOptions = [
  { value: 'hyperconverged', label: 'Hyperconverged', description: 'Local drives pooled with Storage Spaces Direct, storage over RDMA. 1 to 16 nodes, single rack or rack-aware.' },
  { value: 'hybrid', label: 'Hyperconverged with an external SAN', description: 'Storage Spaces Direct plus an external SAN side by side, chosen per workload. The SAN is attached after deployment. Not supported with rack-aware.' },
  { value: 'disaggregated', label: 'Disaggregated', description: 'An external SAN, no Storage Spaces Direct. Compute and storage scale separately: 1 to 8 racks, up to 16 nodes per rack, 64 per cluster.' },
];

const sanOptions = [
  { value: 'fibre-channel', label: 'Fibre Channel SAN', description: 'Storage on a separate Fibre Channel fabric with dual-port HBAs. Four or six Ethernet ports per node.' },
  { value: 'iscsi', label: 'IP-based SAN (iSCSI)', description: 'Storage over dedicated Ethernet ports. The validated layout is six ports per node.' },
];

const cloudOptions = [
  { value: 'public', label: 'Azure public cloud', description: 'Regions worldwide where Azure Local is supported.' },
  { value: 'government', label: 'Azure Government', description: 'US Gov Virginia.' },
];

export const DeploymentScreen: FC = () => {
  const { project, setSection } = useProjectStore();
  const { deployment, landingZone, storage, hardware } = project;
  const regions = regionsFor(deployment.cloud);

  const setMode = (mode: Mode) => {
    setSection('deployment', { ...deployment, mode });
    // A file share witness belongs to disconnected operations only.
    if (mode !== 'disconnected' && hardware.witness === 'file-share') setSection('hardware', { ...hardware, witness: 'cloud' });
  };

  const setArchitecture = (architecture: Architecture) => {
    setSection('deployment', { ...deployment, architecture });
    setSection('storage', { ...storage, architecture: architecture === 'hyperconverged' ? 's2d' : architecture === 'hybrid' ? 'hybrid' : 'san' });
    // Rack-aware is a hyperconverged layout without an external SAN.
    if (architecture !== 'hyperconverged' && hardware.topology === 'rack-aware') setSection('hardware', { ...hardware, topology: 'standard' });
  };

  const setCloud = (cloud: Cloud) => {
    setSection('deployment', { ...deployment, cloud });
    const allowed = regionsFor(cloud);
    if (!allowed.some((r) => r.value === landingZone.region)) setSection('landingZone', { ...landingZone, region: allowed[0].value as typeof landingZone.region });
  };

  return (
    <section className="panel space-y-8">
      <h1 className="text-2xl font-semibold text-gray-900">Connectivity mode and architecture</h1>
      <ChoiceCards name="connectivity-mode" legend="Connectivity mode" value={deployment.mode} onChange={(v) => setMode(v as Mode)} choices={modeOptions} />
      <ChoiceCards name="architecture" legend="Architecture" value={deployment.architecture} onChange={(v) => setArchitecture(v as Architecture)} choices={architectureOptions} />
      {deployment.architecture === 'disaggregated' && (
        <ChoiceCards name="san-type" legend="External SAN" value={deployment.sanType} onChange={(v) => setSection('deployment', { ...deployment, sanType: v as SanType })} choices={sanOptions} />
      )}
      <ChoiceCards name="cloud" legend="Azure cloud" value={deployment.cloud} onChange={(v) => setCloud(v as Cloud)} choices={cloudOptions} />
      <div className="max-w-md">
        <SelectInput
          id="lz-region"
          label="Azure region"
          value={landingZone.region}
          hint="Only regions where Azure Local is supported for the selected cloud."
          options={regions.map((x) => ({ value: x.value, label: x.label }))}
          onChange={(region) => setSection('landingZone', { ...landingZone, region: region as typeof landingZone.region })}
        />
      </div>
      <FindingsPanel prefixes={['deployment', 'landingZone.region']} />
    </section>
  );
};