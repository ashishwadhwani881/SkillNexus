import { useState, useEffect } from 'react';
import { adminAPI, roadmapAPI } from '../services/api';
import { HiOutlineChartBar } from 'react-icons/hi2';

export default function AdminAnalytics() {
    const [roadmaps, setRoadmaps] = useState([]);
    const [selectedRoadmap, setSelectedRoadmap] = useState('');
    const [analytics, setAnalytics] = useState([]);
    const [skillGaps, setSkillGaps] = useState(null);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        roadmapAPI.list().then((res) => setRoadmaps(res.data || [])).catch(() => { });
    }, []);

    useEffect(() => {
        if (!selectedRoadmap) return;
        setLoading(true);
        Promise.all([
            adminAPI.analytics(selectedRoadmap),
            adminAPI.skillGaps(selectedRoadmap),
        ]).then(([aRes, sRes]) => {
            setAnalytics(aRes.data.analytics || []);
            setSkillGaps(sRes.data);
        }).catch(() => { }).finally(() => setLoading(false));
    }, [selectedRoadmap]);

    return (
        <div>
            <div className="page-header">
                <h2><HiOutlineChartBar style={{ verticalAlign: 'middle', marginRight: 8 }} />Analytics Dashboard</h2>
                <p>Track learner progress and identify skill gaps</p>
            </div>

            <div className="input-group" style={{ maxWidth: 400, marginBottom: 24 }}>
                <label>Select Roadmap</label>
                <select className="input" value={selectedRoadmap} onChange={(e) => setSelectedRoadmap(e.target.value)}>
                    <option value="">-- Choose a roadmap --</option>
                    {roadmaps.map((rm) => (
                        <option key={rm.id} value={rm.id}>{rm.title}</option>
                    ))}
                </select>
            </div>

            {loading && <div className="loading-center"><div className="spinner" /></div>}

            {!loading && selectedRoadmap && (
                <>
                    {/* User Progress Table */}
                    <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 12 }}>Learner Progress</h3>
                    {analytics.length === 0 ? (
                        <div className="card" style={{ marginBottom: 24, textAlign: 'center', padding: 30 }}>
                            <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>No users assigned to this roadmap</p>
                        </div>
                    ) : (
                        <div className="table-container" style={{ marginBottom: 28 }}>
                            <table>
                                <thead>
                                    <tr><th>Employee</th><th>Email</th><th>Progress</th><th>Nodes</th><th>Assigned</th><th>Last Active</th></tr>
                                </thead>
                                <tbody>
                                    {analytics.map((a, i) => (
                                        <tr key={i}>
                                            <td style={{ fontWeight: 600, fontSize: 13 }}>{a.employee_name}</td>
                                            <td style={{ fontSize: 13, color: 'var(--text-muted)' }}>{a.email}</td>
                                            <td style={{ width: 200 }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                                    <div className="progress-bar" style={{ flex: 1 }}>
                                                        <div className="progress-fill" style={{ width: `${a.progress_pct}%` }} />
                                                    </div>
                                                    <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--accent-primary)', minWidth: 40, textAlign: 'right' }}>{a.progress_pct}%</span>
                                                </div>
                                            </td>
                                            <td style={{ fontSize: 13 }}><span className="badge badge-success">{a.completed_nodes || 0}</span> / {a.total_nodes || '?'}</td>
                                            <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>{a.assigned_at ? new Date(a.assigned_at).toLocaleDateString() : '-'}</td>
                                            <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>{a.last_active ? new Date(a.last_active).toLocaleDateString() : 'Never'}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}

                    {/* Skill Gaps */}
                    {skillGaps && (
                        <>
                            <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 12 }}>Skill Gap Analysis</h3>
                            <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 12 }}>{skillGaps.total_assigned_users} users assigned • Sorted by lowest completion</p>
                            {skillGaps.skill_gaps?.length > 0 ? (
                                <div className="table-container">
                                    <table>
                                        <thead>
                                            <tr><th>Node</th><th>Level</th><th>Completed</th><th>Not Started</th><th>Completion Rate</th></tr>
                                        </thead>
                                        <tbody>
                                            {skillGaps.skill_gaps.map((g, i) => (
                                                <tr key={i}>
                                                    <td style={{ fontWeight: 600, fontSize: 13 }}>{g.node_title}</td>
                                                    <td><span className="badge badge-neutral">Depth {g.depth_level}</span></td>
                                                    <td style={{ color: 'var(--success)', fontWeight: 600 }}>{g.completed}</td>
                                                    <td style={{ color: 'var(--danger)', fontWeight: 600 }}>{g.not_started}</td>
                                                    <td>
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                                            <div className="progress-bar" style={{ width: 80 }}>
                                                                <div className="progress-fill" style={{ width: `${g.completion_rate_pct}%`, background: g.completion_rate_pct < 30 ? 'var(--danger)' : g.completion_rate_pct < 60 ? 'var(--warning)' : 'var(--success)' }} />
                                                            </div>
                                                            <span style={{ fontSize: 12, fontWeight: 600 }}>{g.completion_rate_pct}%</span>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            ) : (
                                <div className="card" style={{ textAlign: 'center', padding: 30 }}>
                                    <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>No data yet</p>
                                </div>
                            )}
                        </>
                    )}
                </>
            )}
        </div>
    );
}
