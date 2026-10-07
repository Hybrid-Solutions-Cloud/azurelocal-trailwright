import type { FC } from 'react';
import { useProjectStore } from '../model/store';
import type { Project } from '../model/schema';
import { ChoiceCards } from '../components/ChoiceCards';
import { SelectInput } from '../components/Field';
import { FindingsPanel } from '../components/FindingsPanel';
import { regionsFor } from '../model/regions';

type DeploymentType = Project['deployment']['type'];
type Cloud = Project['deployment']['cloud'];

const typeOptions = [
  { value: 'connected', label: 'Hyperconverged, connected', description: 'Machines register with Azure and are managed from the Azure portal. Local drives pooled with Storage Spaces Direct.' },
  { value: 'disconnected', label: 'Hyperconverged, disconnected operations', description: 'Azure Local without a constant Azure connection. Uses a file share witness.' },
  { value: 'disaggregated', label: 'Disaggregated, external SAN', description: 'Compute separate from an external Fibre Channel SAN. Up to 64 machines across racks.' },
];

const cloudOptions = [
  { value: 'public', label: 'Azure public cloud', description: 'Regions worldwide where Azure Local is supported.' },
  { value: 'government', label: 'Azure Government', description: 'US Gov Virginia.' },
];

export const DeploymentScreen: FC = () => {
  const { project, setSection } = useProjectStore();
  const { deployment, landingZone, storage } = project;
  const regions = regionsFor(deployment.cloud);

  const setType = (type: DeploymentType) => {
    setSection('deployment', { ...deployment, type });
    // A disaggregated deployment is SAN storage; leaving it returns to local storage.
    if (type === 'disaggregated' && storage.architecture !== 'san') setSection('storage', { ...storage, architecture: 'san' });
    if (type !== 'disaggregated' && storage.architecture === 'san') setSection('storage', { ...storage, architecture: 's2d' });
    // A file share witness belongs to disconnected operations only.
    if (type !== 'disconnected' && project.hardware.witness === 'file-share') setSection('hardware', { ...project.hardware, witness: 'cloud' });
  };

  const setCloud = (cloud: Cloud) => {
    setSection('deployment', { ...deployment, cloud });
    const allowed = regionsFor(cloud);
    if (!allowed.some((r) => r.value === landingZone.region)) setSection('landingZone', { ...landingZone, region: allowed[0].value as typeof landingZone.region });
  };

  return (
    <section className="panel space-y-6">
      <h1 className="text-2xl font-semibold text-gray-900">Deployment type and region</h1>
      <ChoiceCards name="deployment-type" legend="Deployment type" value={deployment.type} onChange={(v) => setType(v as DeploymentType)} choices={typeOptions} />
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