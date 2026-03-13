import { HiOutlineTrash } from 'react-icons/hi2';

export default function AdminNodeForm({
    show,
    mode,
    nodeForm,
    processing,
    selectedNode,
    onClose,
    onSubmit,
    onFormChange,
}) {
    if (!show) return null;

    const handleLinkChange = (idx, field, value) => {
        const newLinks = [...nodeForm.resource_links];
        newLinks[idx] = { ...newLinks[idx], [field]: value };
        onFormChange({ ...nodeForm, resource_links: newLinks });
    };

    const addLink = () => {
        onFormChange({ ...nodeForm, resource_links: [...nodeForm.resource_links, { title: '', url: '' }] });
    };

    const removeLink = (idx) => {
        onFormChange({ ...nodeForm, resource_links: nodeForm.resource_links.filter((_, i) => i !== idx) });
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal" onClick={(e) => e.stopPropagation()}>
                <h2>{mode === 'add' ? (selectedNode ? 'Add Child Node' : 'Add Root Node') : 'Edit Node'}</h2>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                    <div className="input-group">
                        <label>Title</label>
                        <input
                            className="input"
                            autoFocus
                            value={nodeForm.title}
                            onChange={(e) => onFormChange({ ...nodeForm, title: e.target.value })}
                            placeholder="Node Title"
                        />
                    </div>
                    <div className="input-group">
                        <label>Description</label>
                        <textarea
                            className="input"
                            value={nodeForm.description}
                            onChange={(e) => onFormChange({ ...nodeForm, description: e.target.value })}
                            placeholder="What will they learn?"
                        />
                    </div>
                    <div className="input-group">
                        <label>Position</label>
                        <input
                            type="number"
                            className="input"
                            value={nodeForm.position}
                            onChange={(e) => onFormChange({ ...nodeForm, position: parseInt(e.target.value) || 0 })}
                            placeholder="Ordering position (e.g. 0)"
                        />
                    </div>

                    <div className="input-group">
                        <label style={{ marginBottom: 8, display: 'block' }}>Resources</label>
                        {nodeForm.resource_links.map((link, idx) => (
                            <div key={idx} style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                                <input
                                    className="input"
                                    style={{ flex: 1 }}
                                    value={link.title}
                                    onChange={(e) => handleLinkChange(idx, 'title', e.target.value)}
                                    placeholder="Title (e.g. Guide)"
                                />
                                <input
                                    className="input"
                                    style={{ flex: 2 }}
                                    value={link.url}
                                    onChange={(e) => handleLinkChange(idx, 'url', e.target.value)}
                                    placeholder="https://..."
                                />
                                <button className="btn btn-danger btn-sm" onClick={() => removeLink(idx)}>
                                    <HiOutlineTrash />
                                </button>
                            </div>
                        ))}
                        <button className="btn btn-secondary btn-sm" style={{ alignSelf: 'flex-start' }} onClick={addLink}>
                            + Add Resource Link
                        </button>
                    </div>

                    <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                        <button className="btn btn-primary" onClick={onSubmit} disabled={processing || !nodeForm.title}>
                            {processing ? 'Saving...' : 'Save'}
                        </button>
                        <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
                    </div>
                </div>
            </div>
        </div>
    );
}
