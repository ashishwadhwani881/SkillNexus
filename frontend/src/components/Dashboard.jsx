import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { roadmapAPI, progressAPI, adminAPI } from '../services/api';
import { HiOutlineBolt, HiOutlineTrophy, HiOutlineFire, HiOutlineAcademicCap, HiOutlineArrowRight } from 'react-icons/hi2';

export default function Dashboard() {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [roadmaps, setRoadmaps] = useState([]);
    const [loading, setLoading] = useState(true);
    const [dashboardData, setDashboardData] = useState(null);

    useEffect(() => {
        const isAdminOrManager = user?.role === 'admin' || user?.role === 'manager';

        const fetchRoadmaps = isAdminOrManager
            ? roadmapAPI.list()
            : roadmapAPI.myRoadmaps();

        const fetchDashboard = isAdminOrManager
            ? adminAPI.dashboard()
            : Promise.resolve(null);

        Promise.all([fetchRoadmaps, fetchDashboard])
            .then(([resRoadmaps, resDashboard]) => {
                setRoadmaps(resRoadmaps.data.slice(0, 6));
                if (resDashboard) setDashboardData(resDashboard.data);
            })
            .catch(() => { })
            .finally(() => setLoading(false));
    }, [user]);

    return (
        <div>
            <div className="page-header">
                <h2>Welcome , {user?.full_name?.split(' ')[0]} 👋</h2>
                <p>Continue your learning journey</p>
            </div>

            {/* Stats */}
            {user?.role === 'learner' ? (
                <>
                    <div className="stats-grid">
                        <div className="stat-card">
                            <div className="stat-icon" style={{ background: 'rgba(99,102,241,0.15)', color: 'var(--accent-primary)' }}>
                                <HiOutlineBolt />
                            </div>
                            <div className="stat-info">
                                <h3>{user?.xp || 0}</h3>
                                <p>Total XP</p>
                            </div>
                        </div>
                        <div className="stat-card">
                            <div className="stat-icon" style={{ background: 'rgba(16,185,129,0.15)', color: 'var(--success)' }}>
                                <HiOutlineTrophy />
                            </div>
                            <div className="stat-info">
                                <h3>{user?.level || 1}</h3>
                                <p>Current Level</p>
                            </div>
                        </div>
                        <div className="stat-card">
                            <div className="stat-icon" style={{ background: 'rgba(245,158,11,0.15)', color: 'var(--warning)' }}>
                                <HiOutlineFire />
                            </div>
                            <div className="stat-info">
                                <h3>{user?.streak_days || 0}</h3>
                                <p>Day Streak</p>
                            </div>
                        </div>
                        <div className="stat-card">
                            <div className="stat-icon" style={{ background: 'rgba(59,130,246,0.15)', color: 'var(--info)' }}>
                                <HiOutlineAcademicCap />
                            </div>
                            <div className="stat-info">
                                <h3>{user?.assigned_roadmaps_count || 0}</h3>
                                <p>Roadmaps</p>
                            </div>
                        </div>
                    </div>

                    {/* XP Progress to Next Level */}
                    <div className="card" style={{ marginBottom: 28 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
                            <span style={{ fontSize: 14, fontWeight: 600 }}>Level {user?.level || 1} Progress</span>
                            <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>{(user?.xp || 0) % 200} / 200 XP to next level</span>
                        </div>
                        <div className="progress-bar" style={{ height: 10 }}>
                            <div className="progress-fill" style={{ width: `${((user?.xp || 0) % 200) / 200 * 100}%` }} />
                        </div>
                    </div>
                </>
            ) : (
                <>
                    {/* Admin/Manager Dashboard Summary */}
                    {dashboardData && (
                        <div style={{ marginBottom: 28 }}>
                            <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 16 }}>{user?.role === 'manager' ? 'Team Overview' : 'Org Overview'}</h3>
                            <div className="stats-grid">
                                <div className="stat-card">
                                    <div className="stat-icon" style={{ background: 'rgba(59,130,246,0.15)', color: 'var(--info)' }}>
                                        <HiOutlineAcademicCap />
                                    </div>
                                    <div className="stat-info">
                                        <h3>{dashboardData.total_learners}</h3>
                                        <p>Total Learners</p>
                                    </div>
                                </div>
                                <div className="stat-card">
                                    <div className="stat-icon" style={{ background: 'rgba(16,185,129,0.15)', color: 'var(--success)' }}>
                                        <HiOutlineBolt />
                                    </div>
                                    <div className="stat-info">
                                        <h3>{dashboardData.active_learners}</h3>
                                        <p>Active (30d)</p>
                                    </div>
                                </div>
                                <div className="stat-card">
                                    <div className="stat-icon" style={{ background: 'rgba(99,102,241,0.15)', color: 'var(--accent-primary)' }}>
                                        <HiOutlineTrophy />
                                    </div>
                                    <div className="stat-info">
                                        <h3>{dashboardData.roadmaps_assigned}</h3>
                                        <p>Roadmaps Assigned</p>
                                    </div>
                                </div>
                                <div className="stat-card">
                                    <div className="stat-icon" style={{ background: 'rgba(245,158,11,0.15)', color: 'var(--warning)' }}>
                                        <HiOutlineFire />
                                    </div>
                                    <div className="stat-info">
                                        <h3>{dashboardData.completed_roadmaps}</h3>
                                        <p>Completed Roadmaps</p>
                                    </div>
                                </div>
                            </div>

                            {dashboardData.top_learners_this_week?.length > 0 && (
                                <div className="card" style={{ marginTop: 24 }}>
                                    <h4 style={{ fontSize: 16, fontWeight: 700, marginBottom: 12 }}>Top Learners This Week</h4>
                                    <div className="table-container">
                                        <table>
                                            <thead>
                                                <tr>
                                                    <th>Learner</th>
                                                    <th style={{ textAlign: 'right' }}>XP Gained</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {dashboardData.top_learners_this_week.map((l) => (
                                                    <tr key={l.user_id}>
                                                        <td style={{ fontWeight: 600, fontSize: 13 }}>{l.full_name}</td>
                                                        <td style={{ textAlign: 'right', fontWeight: 700, color: 'var(--accent-primary)' }}>+{l.xp} XP</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </>
            )}

            {/* Available Roadmaps */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <h3 style={{ fontSize: 18, fontWeight: 700 }}>
                    {user?.role === 'admin' || user?.role === 'manager' ? 'Available Roadmaps' : 'Your Assigned Roadmaps'}
                </h3>
                <button className="btn btn-secondary btn-sm" onClick={() => navigate('/roadmaps')}>View All <HiOutlineArrowRight /></button>
            </div>

            {loading ? (
                <div className="loading-center"><div className="spinner" /></div>
            ) : roadmaps.length === 0 ? (
                <div className="card" style={{ textAlign: 'center', padding: 40 }}>
                    <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>
                        {user?.role === 'admin' || user?.role === 'manager'
                            ? 'No roadmaps available yet. Create one!'
                            : 'No roadmaps assigned to you yet. Ask your manager to assign one!'}
                    </p>
                </div>
            ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 16 }}>
                    {roadmaps.map((rm) => (
                        <div key={rm.id} className="card card-glow" style={{ cursor: 'pointer' }} onClick={() => navigate(`/roadmaps/${rm.id}`)}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: 12 }}>
                                <h4 style={{ fontSize: 16, fontWeight: 700 }}>{rm.title}</h4>
                                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                                    <span className="badge badge-info">{rm.category || 'General'}</span>
                                    {!rm.is_published && (
                                        <span className="badge badge-warning">Draft</span>
                                    )}
                                </div>
                            </div>
                            <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 14, lineHeight: 1.5, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                                {rm.description || 'No description'}
                            </p>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{rm.total_nodes} nodes</span>
                                <button className="btn btn-primary btn-sm">Explore <HiOutlineArrowRight /></button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
