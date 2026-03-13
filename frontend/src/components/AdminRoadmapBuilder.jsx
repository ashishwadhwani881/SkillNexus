import { useState, useEffect } from 'react';
import { roadmapAPI } from '../services/api';
import { useNavigate } from 'react-router-dom';
import { HiOutlineCog, HiOutlinePlus, HiOutlineSparkles, HiOutlinePencil, HiOutlineTrash, HiOutlineArrowDownTray, HiOutlineCheckCircle, HiOutlineArrowUpTray, HiOutlineDocumentArrowDown } from 'react-icons/hi2';

export default function AdminRoadmapBuilder() {
    const [roadmaps, setRoadmaps] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showCreate, setShowCreate] = useState(false);
    const [showGenerate, setShowGenerate] = useState(false);
    const [form, setForm] = useState({ title: '', description: '', category: '' });
    const [prompt, setPrompt] = useState('');
    const [creating, setCreating] = useState(false);
    const [generating, setGenerating] = useState(false);
    const [importing, setImporting] = useState(false);
    const [publishing, setPublishing] = useState(null); // roadmap id being published
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
            setForm({ title: '', description: '', category: '' });
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

    const handlePublish = async (id) => {
        if (!confirm('Publish this roadmap? It will become visible to learners once assigned.')) return;
        setPublishing(id);
        try {
            await roadmapAPI.publish(id);
            fetchRoadmaps();
        } catch (err) {
            alert(err.response?.data?.detail || 'Publish failed');
        }
        setPublishing(null);
    };

    const handleExport = async (roadmap) => {
        try {
            const res = await roadmapAPI.exportJSON(roadmap.id);
            const blob = new Blob([JSON.stringify(res.data, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            // Sanitize title for filename
            const safeTitle = roadmap.title.replace(/[^a-z0-9]/gi, '_').toLowerCase() || `roadmap_${roadmap.id}`;
            a.download = `${safeTitle}.json`;
            a.click();
            URL.revokeObjectURL(url);
        } catch { alert('Export failed'); }
    };

    const handleImport = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // Reset the input value so the same file can be selected again if needed
        e.target.value = null;

        if (file.type !== 'application/json' && !file.name.endsWith('.json')) {
            return alert('Please upload a valid JSON file.');
        }

        setImporting(true);
        try {
            const text = await file.text();
            let data;
            try {
                data = JSON.parse(text);
            } catch (err) {
                setImporting(false);
                return alert('Invalid JSON format. Cannot parse file.');
            }

            if (!data.title) {
                setImporting(false);
                return alert('Invalid Roadmap JSON: "title" field is required at the root level.');
            }
            if (!data.nodes || data.nodes.length === 0) {
                setImporting(false);
                return alert('Roadmap must contain at least one node.');
            }

            await roadmapAPI.importNewJSON(data);
            fetchRoadmaps();
        } catch (err) {
            alert(err.response?.data?.detail || 'Import failed');
        }
        setImporting(false);
    };

    const handleDownloadSample = () => {
        const sampleData = {
            "title": "Sample Developer Roadmap",
            "description": "Learn the basics of fullstack development.",
            "category": "Fullstack",
            "nodes": [
                {
                    "title": "Frontend Basics",
                    "description": "HTML, CSS, and plain JavaScript.",
                    "resource_links": [
                        { "title": "MDN Web Docs", "url": "https://developer.mozilla.org" }
                    ],
                    "children": [
                        {
                            "title": "React.js",
                            "description": "Build modern UIs",
                            "resource_links": [],
                            "children": []
                        }
                    ]
                },
                {
                    "title": "Backend Basics",
                    "description": "Node.js and Express.",
                    "resource_links": [],
                    "children": []
                }
            ]
        };
        const blob = new Blob([JSON.stringify(sampleData, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `sample_roadmap_template.json`;
        a.click();
        URL.revokeObjectURL(url);
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
                <label className="btn btn-secondary" style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }} title="Upload a JSON file to create or update a roadmap">
                    <HiOutlineArrowUpTray /> {importing ? 'Importing...' : 'Import JSON'}
                    <input type="file" accept=".json" style={{ display: 'none' }} onChange={handleImport} disabled={importing} />
                </label>
                <button className="btn btn-secondary" onClick={handleDownloadSample} style={{ display: 'flex', alignItems: 'center', gap: '6px' }} title="Download a sample JSON formatting template">
                    <HiOutlineDocumentArrowDown /> Sample JSON
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
                            <tr><th>Title</th><th>Category</th><th>Nodes</th><th>Status</th><th>Actions</th></tr>
                        </thead>
                        <tbody>
                            {roadmaps.map((rm) => (
                                <tr key={rm.id}>
                                    <td style={{ fontWeight: 600, fontSize: 13 }}>{rm.title}</td>
                                    <td><span className="badge badge-info">{rm.category || '-'}</span></td>
                                    <td>{rm.total_nodes}</td>
                                    <td>
                                        {rm.is_published
                                            ? <span className="badge badge-success">Published</span>
                                            : <span className="badge badge-warning">Draft</span>
                                        }
                                    </td>
                                    <td>
                                        <div style={{ display: 'flex', gap: 6 }}>
                                            {!rm.is_published && (
                                                <button className="btn btn-secondary btn-sm" onClick={() => navigate(`/roadmaps/${rm.id}`)} title="Edit">
                                                    <HiOutlinePencil />
                                                </button>
                                            )}
                                            {!rm.is_published && (
                                                <button
                                                    className="btn btn-primary btn-sm"
                                                    onClick={() => handlePublish(rm.id)}
                                                    disabled={publishing === rm.id}
                                                    title="Publish Roadmap"
                                                    style={{ gap: 4 }}
                                                >
                                                    <HiOutlineCheckCircle />
                                                    {publishing === rm.id ? 'Publishing...' : 'Publish'}
                                                </button>
                                            )}
                                            <button className="btn btn-secondary btn-sm" onClick={() => handleExport(rm)} title="Export JSON">
                                                <HiOutlineArrowDownTray />
                                            </button>
                                            {!rm.is_published && (
                                                <button className="btn btn-danger btn-sm" onClick={() => handleDelete(rm.id)} title="Delete">
                                                    <HiOutlineTrash />
                                                </button>
                                            )}
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
                        <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 16 }}>
                            New roadmaps start as <strong>Draft</strong>. Add nodes, then publish when ready.
                        </p>
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
                                <button className="btn btn-primary" onClick={handleCreate} disabled={creating || !form.title}>{creating ? 'Creating...' : 'Create as Draft'}</button>
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
                        <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 16 }}>Describe a learning path and AI will generate the roadmap with nodes structured. The roadmap will be created as a <strong>Draft</strong> for you to review and publish.</p>
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
