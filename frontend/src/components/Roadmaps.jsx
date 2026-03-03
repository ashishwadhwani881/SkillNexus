import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { roadmapAPI } from '../services/api';
import { HiOutlineArrowRight, HiOutlineMagnifyingGlass } from 'react-icons/hi2';

export default function Roadmaps() {
    const [roadmaps, setRoadmaps] = useState([]);
    const [search, setSearch] = useState('');
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();
    const { user } = useAuth();

    useEffect(() => {
        const fetchMethod = user?.role === 'admin' || user?.role === 'manager'
            ? roadmapAPI.list()
            : roadmapAPI.myRoadmaps();

        fetchMethod.then((res) => setRoadmaps(res.data)).catch(() => { }).finally(() => setLoading(false));
    }, [user]);

    const filtered = roadmaps.filter((rm) =>
        rm.title.toLowerCase().includes(search.toLowerCase()) ||
        (rm.category || '').toLowerCase().includes(search.toLowerCase())
    );

    return (
        <div>
            <div className="page-header">
                <h2>{user?.role === 'admin' || user?.role === 'manager' ? 'All Learning Roadmaps' : 'Your Assigned Roadmaps'}</h2>
                <p>{user?.role === 'admin' || user?.role === 'manager' ? 'Explore and manage the entire skill library' : 'Explore interactive roadmaps to skill up'}</p>
            </div>

            <div style={{ marginBottom: 24, position: 'relative' }}>
                <HiOutlineMagnifyingGlass style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                <input
                    className="input"
                    style={{ width: '100%', maxWidth: 400, paddingLeft: 38 }}
                    placeholder="Search roadmaps..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                />
            </div>

            {loading ? (
                <div className="loading-center"><div className="spinner" /></div>
            ) : filtered.length === 0 ? (
                <div className="card" style={{ textAlign: 'center', padding: 40 }}>
                    <p style={{ color: 'var(--text-muted)' }}>No roadmaps found</p>
                </div>
            ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: 16 }}>
                    {filtered.map((rm) => (
                        <div key={rm.id} className="card card-glow" style={{ cursor: 'pointer' }} onClick={() => navigate(`/roadmaps/${rm.id}`)}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: 12 }}>
                                <h4 style={{ fontSize: 16, fontWeight: 700 }}>{rm.title}</h4>
                                <span className="badge badge-info">{rm.category || 'General'}</span>
                            </div>
                            <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 14, lineHeight: 1.5, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                                {rm.description || 'No description provided'}
                            </p>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{rm.total_nodes} nodes</span>
                                <button className="btn btn-primary btn-sm">Open <HiOutlineArrowRight /></button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
