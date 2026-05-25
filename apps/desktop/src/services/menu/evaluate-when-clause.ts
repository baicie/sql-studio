export function evaluateWhenClause(expression: string, context: Record<string, unknown>): boolean {
  const trimmed = expression.trim();

  if (!trimmed) {
    return true;
  }

  if (trimmed.includes('==')) {
    const [key, value] = trimmed.split('==').map((item) => item.trim());

    return String(context[key]) === value;
  }

  if (trimmed.includes('!=')) {
    const [key, value] = trimmed.split('!=').map((item) => item.trim());

    return String(context[key]) !== value;
  }

  return Boolean(context[trimmed]);
}
