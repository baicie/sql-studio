import type { SignatureStatus } from '../types';

export function SignatureBadge(props: { status?: SignatureStatus }) {
  const status = props.status ?? 'unknown';

  return <span className={getClassName(status)}>{getText(status)}</span>;
}

function getText(status: SignatureStatus) {
  if (status === 'verified') return 'Verified';
  if (status === 'unsigned') return 'Unsigned';
  if (status === 'invalid') return 'Invalid Signature';
  if (status === 'untrusted') return 'Untrusted';
  return 'Unknown';
}

function getClassName(status: SignatureStatus) {
  const base = 'rounded px-1.5 py-0.5 text-[10px] uppercase';

  if (status === 'verified') {
    return `${base} bg-green-500/10 text-green-600`;
  }

  if (status === 'unsigned') {
    return `${base} bg-yellow-500/10 text-yellow-600`;
  }

  if (status === 'untrusted') {
    return `${base} bg-orange-500/10 text-orange-600`;
  }

  if (status === 'invalid') {
    return `${base} bg-red-500/10 text-red-600`;
  }

  return `${base} bg-muted text-muted-foreground`;
}
