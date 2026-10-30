import { Children, cloneElement, isValidElement } from 'react';

function textOf(node) {
  if (typeof node === 'string' || typeof node === 'number') return String(node);
  if (isValidElement(node)) return textOf(node.props.children);
  if (Array.isArray(node)) return node.map(textOf).join('');
  return '';
}

// Keep the semantic table on desktop; label the same cells for mobile cards.
export function ResponsiveTable({ children, className = '', label, ...props }) {
  const parts = Children.toArray(children.props.children);
  const head = parts.find(part => isValidElement(part) && part.type === 'thead');
  const headerRow = Children.toArray(head?.props.children).find(row => isValidElement(row) && row.type === 'tr');
  const labels = Children.toArray(headerRow?.props.children).map(cell => textOf(cell));
  const controls = Children.toArray(headerRow?.props.children).filter((cell, index) => !labels[index] && isValidElement(cell) && cell.props.children);
  const table = cloneElement(children, {}, parts.map(part => {
    if (!isValidElement(part) || part.type !== 'tbody') return part;
    return cloneElement(part, {}, Children.map(part.props.children, row => {
      if (!isValidElement(row) || row.type !== 'tr') return row;
      return cloneElement(row, {}, Children.map(row.props.children, (cell, index) => {
        if (!isValidElement(cell) || cell.props.colSpan > 1) return cell;
        return cloneElement(cell, { 'data-label': labels[index] || undefined });
      }));
    }));
  }));
  return <div {...props} className={`portal-table-wrap mobile-card-table ${className}`} tabIndex={0} role="region" aria-label={label}>{!!controls.length && <div className="mobile-table-controls">{controls.map((cell, index) => <label key={index}>{cell.props.children}<span>Select this page</span></label>)}</div>}{table}</div>;
}
