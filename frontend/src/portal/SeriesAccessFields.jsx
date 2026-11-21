export function SeriesAccessFields({ choices, value, onChange, error, onBlur }) {
  return <fieldset className="school-series-access" aria-invalid={!!error} aria-describedby={error ? 'school-series-error' : undefined} onBlur={event => { if (!event.currentTarget.contains(event.relatedTarget)) onBlur?.(); }}><legend>Allowed Series</legend>
    <p>Choose the book series this school can use.</p>
    <div>{choices.map(item => {
      const selected = value.includes(item.id);
      return <label key={item.id} className={selected ? 'selected' : ''}>
        <input type="checkbox" name="allowed-series" value={item.id} checked={selected} aria-invalid={!!error} onChange={event => onChange(event.target.checked ? [...value, item.id] : value.filter(id => id !== item.id))} />
        <span>{item.name}</span><span className="series-selection-mark" aria-hidden="true">{selected ? '✓' : '+'}</span>
      </label>;
    })}</div>
    {error ? <p id="school-series-error" className="sr-only">{error}</p> : !value.length && <p className="school-edit-hint">No series selected. This account will have no book access.</p>}
  </fieldset>;
}
