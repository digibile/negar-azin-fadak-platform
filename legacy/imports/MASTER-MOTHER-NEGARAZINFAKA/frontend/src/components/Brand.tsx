import { brand } from '../lib/brand';

interface BrandProps {
  /** Renders the inverse palette, for use on the dark shell sidebar and the hero band. */
  readonly tone?: 'default' | 'inverse';
  /** Smaller mark and hides the company sub-line, for the narrow mobile top bar. */
  readonly compact?: boolean;
}

/** The product lockup: the mark, the product name and the company behind it. */
export function Brand({ tone = 'default', compact = false }: BrandProps) {
  const classes = ['brand', tone === 'inverse' ? 'brand--inverse' : '', compact ? 'brand--compact' : '']
    .filter((value) => value.length > 0)
    .join(' ');

  return (
    <span className={classes}>
      <img className="brand__mark" src="/brand-mark.svg" alt="" width={40} height={40} />
      <span className="brand__text">
        <span className="brand__name">{brand.productName}</span>
        {!compact && <span className="brand__sub">{brand.companyName}</span>}
      </span>
    </span>
  );
}
