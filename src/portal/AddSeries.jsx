import { useState } from 'react';
import { useDemo } from './DemoContext.jsx';
import { Feedback, Modal } from './Shared.jsx';
import { CatalogPage } from './CatalogPage.jsx';

function CreateSeriesDialog({ onClose, onSaved }) {
  const { store } = useDemo();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [feedback, setFeedback] = useState(null);

  function submit(event) {
    event.preventDefault();
    try {
      const created = store.createSeries({ name, description });
      onSaved(`${created.name} created. It is now available in the user library's series selection.`);
      onClose();
    } catch (error) { setFeedback({ text: error.message, error: true }); }
  }

  return <Modal title="Add New Series" onClose={onClose}>
      <form onSubmit={submit}>
        <Feedback message={feedback} />
        <label className="portal-field">Publisher<input value="Javed Publishers" readOnly /></label>
        <label className="portal-field">Series name<input name="name" value={name} onChange={event => setName(event.target.value)} required maxLength={100} placeholder="e.g. Bright Minds Series" /></label>
        <label className="portal-field">Description (optional)<textarea name="description" value={description} onChange={event => setDescription(event.target.value)} maxLength={500} rows={3} placeholder="A short introduction to this series" /></label>
        <p className="portal-muted small">New series start without books. Existing books stay in their current series.</p>
        <div className="portal-actions"><button type="button" className="portal-secondary" onClick={onClose}>Cancel</button><button type="submit" className="portal-primary">Create Series</button></div>
      </form>
  </Modal>;
}

export function AddSeries() {
  const { series } = useDemo();
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState(null);
  const fields = [
    { id: 'publisher', label: 'Publisher', initial: 'Javed Publishers' },
    { id: 'name', label: 'Series', placeholder: 'Search series name' }
  ];
  const columns = [
    { id: 'publisher', label: 'Publisher', render: () => 'Javed Publishers' },
    { id: 'name', label: 'Series' },
    { id: 'description', label: 'Description', render: row => row.description || 'Not added' },
    { id: 'type', label: 'Status', render: row => <span className="portal-pill">{row.id.startsWith('custom-') ? 'New series' : 'Original'}</span> }
  ];
  return <CatalogPage title="Add New Series" description="Manage your series and create a new collection for your readers" fields={fields} columns={columns} rows={series} matches={(row, filters) => 'javed publishers'.includes(filters.publisher.trim().toLowerCase()) && row.name.toLowerCase().includes(filters.name.trim().toLowerCase())} onAdd={() => setOpen(true)} message={message} emptyText="No series match your filters.">
    {open && <CreateSeriesDialog onClose={() => setOpen(false)} onSaved={text => setMessage({ text })} />}
  </CatalogPage>;
}
