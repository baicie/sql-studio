export function evaluateWhenClause(expression: string, context: Record<string, unknown>): boolean {
  const trimmed = expression.trim();

  if (!trimmed) {
    return true;
  }

  const parts = trimmed.split(/\s+/);

  if (parts.length !== 3) {
    return false;
  }

  const [key, operator, value] = parts;

  if (operator === '==') {
    return String(context[key]) === value;
  }

  if (operator === '!=') {
    return String(context[key]) !== value;
  }

  return false;
}
