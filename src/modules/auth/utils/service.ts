import { ServiceName } from "../types.js";

export const SUPPORTED_SERVICES: ServiceName[] = [
  ServiceName.JIRA,
  ServiceName.BITBUCKET,
  ServiceName.CONFLUENCE,
  ServiceName.KYG_KMESH,
];

export function getServiceDisplayName(service: ServiceName): string {
  const names: Record<ServiceName, string> = {
    [ServiceName.JIRA]: "Jira",
    [ServiceName.BITBUCKET]: "Bitbucket",
    [ServiceName.CONFLUENCE]: "Confluence",
    [ServiceName.KYG_KMESH]: "KYG K-Mesh",
  };
  return names[service] || service;
}

export function validateService(
  service: string | boolean | undefined
): ServiceName | null {
  if (!service || service === true) {
    return null;
  }

  const normalized = service.toLowerCase();
  const serviceEnum = Object.values(ServiceName).find(
    (s) => s === normalized
  ) as ServiceName | undefined;

  if (serviceEnum && SUPPORTED_SERVICES.includes(serviceEnum)) {
    return serviceEnum;
  }

  return null;
}
