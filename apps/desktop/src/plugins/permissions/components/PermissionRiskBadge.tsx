import type { PermissionRiskLevel } from '../types';

export function PermissionRiskBadge(props: { risk: PermissionRiskLevel }) {
  return <span className={getClassName(props.risk)}>{props.risk}</span>;
}

function getClassName(risk: PermissionRiskLevel) {
  const base = 'rounded px-1.5 py-0.5 text-[10px] uppercase';

  if (risk === 'low') {
    return `${base} bg-green-500/10 text-green-600`;
  }

  if (risk === 'medium') {
    return `${base} bg-blue-500/10 text-blue-600`;
  }

  if (risk === 'high') {
    return `${base} bg-yellow-500/10 text-yellow-600`;
  }

  return `${base} bg-red-500/10 text-red-600`;
}
