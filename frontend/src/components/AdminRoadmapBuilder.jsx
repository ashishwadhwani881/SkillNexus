import { useState, useEffect } from 'react';
import { roadmapAPI } from '../services/api';
import { useNavigate } from 'react-router-dom';
import { HiOutlineCog, HiOutlinePlus, HiOutlineSparkles, HiOutlinePencil, HiOutlineTrash, HiOutlineArrowDownTray, HiOutlineArrowUpTray } from 'react-icons/hi2';

export default function AdminRoadmapBuilder() {
    const [roadmaps, setRoadmaps] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showCreate, setShowCreate] = useState(false);
    const [showGenerate, setShowGenerate] = useState(false);
    const [form, setForm] = useState({ title: '', description: '', category: '', is_published: true });
    const [prompt, setPrompt] = useState('');
    const [creating, setCreating] = useState(false);
    const [generating, setGenerating] = useState(false);
    const navigate = useNavigate();

    const fetchRoadmaps = () => {
        setLoading(true);
        roadmapAPI.list().then((res) => setRoadmaps(res.data || [])).catch(() => { }).finally(() => setLoading(false));
    };

    useEffect(() => { fetchRoadmaps(); }, []);

    const handleCreate = async () => {
        setCreating(true);
        try {
            await roadmapAPI.create(form);
            setShowCreate(false);
            setForm({ title: '', description: '', category: '', is_published: true });
            fetchRoadmaps();
        } catch (err) {
            alert(err.response?.data?.detail || 'Failed');
        }
        setCreating(false);
    };

    const handleGenerate = async () => {
        setGenerating(true);
        try {
            const res = await roadmapAPI.generate(prompt);
            setShowGenerate(false);
            setPrompt('');
            fetchRoadmaps();
            navigate(`/roadmaps/${res.data.id}`);
        } catch (err) {
            alert(err.response?.data?.detail || 'AI generation failed');
        }
        setGenerating(false);
    };

    const handleDelete = async (id) => {
        if (!confirm('Delete this roadmap?')) return;
        try {
            await roadmapAPI.delete(id);
            fetchRoadmaps();
        } catch (err) {
            alert(err.response?.data?.detail || 'Delete failed');
        }
    };

    const handleExport = async (id) => {
        try {
            const res = await roadmapAPI.exportJSON(id);
            const blob = new Blob([JSON.stringify(res.data, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `roadmap_${id}.json`;
            a.click();
            URL.revokeObjectURL(url);
        } catch { alert('Export failed'); }
    };

    return (
        <div>
            <div className="page-header">
                <h2><HiOutlineCog style={{ verticalAlign: 'middle', marginRight: 8 }} />Roadmap Builder</h2>
                <p>Create, manage, and AI-generate learning roadmaps</p>
            </div>

            <div style={{ display: 'flex', gap: 10, marginBottom: 24 }}>
                <button className="btn btn-primary" onClick={() => setShowCreate(true)}>
                    <HiOutlinePlus /> Create Roadmap
                </button>
                <button className="btn btn-secondary" onClick={() => setShowGenerate(true)} style={{ background: 'linear-gradient(135deg, rgba(168,85,247,0.2), rgba(99,102,241,0.2))', borderColor: 'rgba(168,85,247,0.3)' }}>
                    <HiOutlineSparkles /> AI Generate
                </button>
            </div>

            {loading ? (
                <div className="loading-center"><div className="spinner" /></div>
            ) : roadmaps.length === 0 ? (
                <div className="card" style={{ textAlign: 'center', padding: 40 }}>
                    <p style={{ color: 'var(--text-muted)' }}>No roadmaps yet. Create your first one!</p>
                </div>
            ) : (
                <div className="table-container">
                    <table>
                        <thead>
                            <tr><th>Title</th><th>Category</th><th>Nodes</th><th>Published</th><th>Actions</th></tr>
                        </thead>
                        <tbody>
                            {roadmaps.map((rm) => (
                                <tr key={rm.id}>
                                    <td style={{ fontWeight: 600, fontSize: 13 }}>{rm.title}</td>
                                    <td><span className="badge badge-info">{rm.category || '-'}</span></td>
                                    <td>{rm.total_nodes}</td>
                                    <td>{rm.is_published ? <span className="badge badge-success">Yes</span> : <span className="badge badge-neutral">Draft</span>}</td>
                                    <td>
                                        <div style={{ display: 'flex', gap: 6 }}>
                                            <button className="btn btn-secondary btn-sm" onClick={() => navigate(`/roadmaps/${rm.id}`)} title="Edit">
                                                <HiOutlinePencil />
                                            </button>
                                            <button className="btn btn-secondary btn-sm" onClick={() => handleExport(rm.id)} title="Export JSON">
                                                <HiOutlineArrowDownTray />
                                            </button>
                                            <button className="btn btn-danger btn-sm" onClick={() => handleDelete(rm.id)} title="Delete">
                                                <HiOutlineTrash />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Create Modal */}
            {showCreate && (
                <div className="modal-overlay" onClick={() => setShowCreate(false)}>
                    <div className="modal" onClick={(e) => e.stopPropagation()}>
                        <h2>Create Roadmap</h2>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                            <div className="input-group">
                                <label>Title</label>
                                <input className="input" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="e.g. React Developer 2026" />
                            </div>
                            <div className="input-group">
                                <label>Description</label>
                                <textarea className="input" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="What will learners master?" />
                            </div>
                            <div className="input-group">
                                <label>Category</label>
                                <input className="input" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} placeholder="e.g. Frontend, DevOps, Data" />
                            </div>
                            <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                                <button className="btn btn-primary" onClick={handleCreate} disabled={creating || !form.title}>{creating ? 'Creating...' : 'Create'}</button>
                                <button className="btn btn-secondary" onClick={() => setShowCreate(false)}>Cancel</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* AI Generate Modal */}
            {showGenerate && (
                <div className="modal-overlay" onClick={() => setShowGenerate(false)}>
                    <div className="modal" onClick={(e) => e.stopPropagation()}>
                        <h2><HiOutlineSparkles style={{ verticalAlign: 'middle', marginRight: 6 }} /> AI Roadmap Generator</h2>
                        <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 16 }}>Describe a learning path and AI will generate the roadmap with nodes structured.</p>
                        <div className="input-group" style={{ marginBottom: 16 }}>
                            <label>Prompt</label>
                            <textarea className="input" value={prompt} onChange={(e) => setPrompt(e.target.value)} placeholder="e.g. Create a comprehensive roadmap for becoming a Senior React Developer in 2026, covering fundamentals to advanced topics like SSR, state management, testing, and deployment." style={{ minHeight: 120 }} />
                        </div>
                        <div style={{ display: 'flex', gap: 8 }}>
                            <button className="btn btn-primary" onClick={handleGenerate} disabled={generating || !prompt.trim()}>
                                {generating ? 'Generating with AI...' : 'Generate Roadmap'}
                            </button>
                            <button className="btn btn-secondary" onClick={() => setShowGenerate(false)}>Cancel</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
