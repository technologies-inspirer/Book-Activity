import { ResponsiveTable } from './ResponsiveTable.jsx';
import { useState } from 'react';
import { Feedback } from './Shared.jsx';

export function CatalogPage({ title, description, fields, columns, rows, matches, onAdd, message, emptyText, children }) {
  const initial = Object.fromEntries(fields.map(field => [field.id, field.initial || '']));
  const [filters, setFilters] = useState(initial);
  const [applied, setApplied] = useState(initial);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const filtered = rows.filter(row => matches(row, applied));
  const pages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const currentPage = Math.min(page, pages);
  const shown = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  return <div className="assignment-page catalog-page">
    <a className="school-back" href="#/admin" aria-label="Back to dashboard">&#8592;</a>
    <div className="portal-page-heading"><div><h1>{title}</h1><p className="portal-muted">{description}</p></div><button type="button" className="portal-primary" onClick={onAdd}>+ Add</button></div>
    <Feedback message={message} />
    <form className="assignment-filters" onSubmit={event => { event.preventDefault(); setApplied({ ...filters }); setPage(1); }}>
      {fields.map(field => <label className="portal-field" key={field.id}>{field.label}{field.options ? <select name={field.id} value={filters[field.id]} onChange={event => setFilters({ ...filters, [field.id]: event.target.value })}><option value="">{field.placeholder}</option>{field.options.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select> : <input name={field.id} value={filters[field.id]} placeholder={field.placeholder} onChange={event => setFilters({ ...filters, [field.id]: event.target.value })} />}</label>)}
      <div className="assignment-search"><button type="button" className="portal-secondary" onClick={() => { setFilters(initial); setApplied(initial); setPage(1); }}>Reset</button><button className="portal-primary">Search</button></div>
    </form>
    <ResponsiveTable className="assignment-table catalog-table" label={`${title} collection`}><table><caption className="sr-only">{title} collection</caption><thead><tr>{columns.map(column => <th scope="col" key={column.id}>{column.label}</th>)}</tr></thead><tbody>
      {shown.map(row => <tr key={row.key || row.id}>{columns.map(column => <td key={column.id}>{column.render ? column.render(row) : row[column.id]}</td>)}</tr>)}
      {!shown.length && <tr><td colSpan={columns.length} className="assignment-no-results">{emptyText}</td></tr>}
    </tbody></table></ResponsiveTable>
    <div className="assignment-pagination"><div><button type="button" className="portal-secondary" disabled={currentPage === 1} onClick={() => setPage(currentPage - 1)}>Previous</button><span aria-live="polite">Page {currentPage} of {pages}</span><button type="button" className="portal-secondary" disabled={currentPage === pages} onClick={() => setPage(currentPage + 1)}>Next</button></div><label>Show<select aria-label="Rows per page" value={pageSize} onChange={event => { setPageSize(Number(event.target.value)); setPage(1); }}>{[10, 20, 50].map(size => <option key={size} value={size}>{size}</option>)}</select><span>{filtered.length} result{filtered.length === 1 ? '' : 's'}</span></label></div>
    <p className="portal-muted small">Added series and subjects are saved in this browser when local storage is available.</p>
    {children}
  </div>;
}
