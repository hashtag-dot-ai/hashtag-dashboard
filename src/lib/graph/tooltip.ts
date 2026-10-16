/**
 * Shared tooltip markup for node and edge hovers, used by both graph engines.
 * The tooltip is a plain div owned by the renderer (no React re-renders on
 * mousemove), so this builds an HTML string.
 */

/** Property keys never shown in tooltips (too large or engine-internal). */
export const TOOLTIP_SKIP_KEYS = new Set(['embedding', 'text']);

export const TOOLTIP_MAX_PROPS = 10;
export const TOOLTIP_MAX_VALUE_LEN = 60;

export function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function formatValue(v: unknown): string {
  if (v == null) return '';
  if (typeof v === 'object') {
    try {
      return JSON.stringify(v);
    } catch {
      return String(v);
    }
  }
  return String(v);
}

export interface TooltipContent {
  /** Bold first line, e.g. node labels or the relationship type. */
  title: string;
  /** Optional muted second line, e.g. "Alice → Acme" for an edge. */
  subtitle?: string;
  /** Raw properties; large/internal keys are filtered here. */
  properties: Record<string, unknown>;
  /** Extra keys to hide, on top of TOOLTIP_SKIP_KEYS. */
  skip?: Iterable<string>;
  /** Text shown when no properties remain after filtering. */
  emptyText?: string;
}

/** Return the property entries a tooltip would show, in order. */
export function visibleProperties(
  properties: Record<string, unknown>,
  skip: Iterable<string> = [],
): [string, unknown][] {
  const hidden = new Set<string>([...TOOLTIP_SKIP_KEYS, ...skip]);
  return Object.entries(properties)
    .filter(([k]) => !hidden.has(k))
    .slice(0, TOOLTIP_MAX_PROPS);
}

export function tooltipHtml({ title, subtitle, properties, skip = [], emptyText }: TooltipContent): string {
  const props = visibleProperties(properties, skip);
  const rows = props.length
    ? props.map(([k, v]) =>
        `<div class="text-xs text-gray-500 truncate">
          <span class="text-gray-400">${escapeHtml(k)}:</span> ${escapeHtml(formatValue(v).slice(0, TOOLTIP_MAX_VALUE_LEN))}
        </div>`,
      ).join('')
    : emptyText
      ? `<div class="text-xs text-gray-400 italic">${escapeHtml(emptyText)}</div>`
      : '';

  return `
    <div class="font-semibold text-xs ${subtitle ? '' : 'mb-1'} text-gray-800">${escapeHtml(title)}</div>
    ${subtitle ? `<div class="text-xs text-gray-400 mb-1 truncate">${escapeHtml(subtitle)}</div>` : ''}
    ${rows}
  `;
}
