import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { userAPI } from '../services/api';
import { HiOutlineBolt, HiOutlineFire, HiOutlineAcademicCap, HiOutlineArrowUpTray, HiOutlineDocumentText } from 'react-icons/hi2';

export default function Profile() {
    const { user, refreshUser } = useAuth();
    const [editing, setEditing] = useState(false);
    const [form, setForm] = useState({ full_name: '', current_job_role: '' });
    const [points, setPoints] = useState([]);
    const [skills, setSkills] = useState([]);
    const [uploading, setUploading] = useState(false);
    const [resumeResult, setResumeResult] = useState(null);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (user) {
            setForm({ full_name: user.full_name || '', current_job_role: user.current_job_role || '' });
            setSkills(user.skills || []);
        }
        userAPI.getPoints().then((res) => setPoints(res.data.transactions || [])).catch(() => { });
    }, [user]);

    const handleSave = async () => {
        setSaving(true);
        try {
            await userAPI.updateProfile(form);
            await refreshUser();
            setEditing(false);
        } catch { }
        setSaving(false);
    };

    const handleResume = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        setUploading(true);
        try {
            const res = await userAPI.uploadResume(file);
            setResumeResult(res.data);
            await refreshUser();
        } catch (err) {
            alert(err.response?.data?.detail || 'Upload failed');
        }
        setUploading(false);
    };

    return (
        <div>
            <div className="page-header">
                <h2>My Profile</h2>
                <p>Your learning stats and settings</p>
            </div>

            {/* Profile Card */}
            <div className="card" style={{ display: 'flex', gap: 24, alignItems: 'center', marginBottom: 24 }}>
                <div className="sidebar-avatar" style={{ width: 72, height: 72, fontSize: 28 }}>
                    {user?.full_name?.[0] || 'U'}
                </div>
                <div style={{ flex: 1 }}>
                    {editing ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                            <div className="input-group">
                                <label>Full Name</label>
                                <input className="input" value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} />
                            </div>
                            <div className="input-group">
                                <label>Job Role</label>
                                <input className="input" value={form.current_job_role} onChange={(e) => setForm({ ...form, current_job_role: e.target.value })} />
                            </div>
                            <div style={{ display: 'flex', gap: 8 }}>
                                <button className="btn btn-primary btn-sm" onClick={handleSave} disabled={saving}>Save</button>
                                <button className="btn btn-secondary btn-sm" onClick={() => setEditing(false)}>Cancel</button>
                            </div>
                        </div>
                    ) : (
                        <>
                            <h3 style={{ fontSize: 22, fontWeight: 700 }}>{user?.full_name}</h3>
                            <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>{user?.email}</p>
                            <p style={{ color: 'var(--text-secondary)', fontSize: 13 }}>{user?.current_job_role || 'No job role set'}</p>
                            <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                                <span className="badge badge-info">{user?.role}</span>
                                <button className="btn btn-secondary btn-sm" onClick={() => setEditing(true)}>Edit Profile</button>
                            </div>
                        </>
                    )}
                </div>
            </div>

            {/* Stats */}
            <div className="stats-grid">
                <div className="stat-card">
                    <div className="stat-icon" style={{ background: 'rgba(99,102,241,0.15)', color: 'var(--accent-primary)' }}><HiOutlineBolt /></div>
                    <div className="stat-info"><h3>{user?.xp || 0}</h3><p>Total XP</p></div>
                </div>
                <div className="stat-card">
                    <div className="stat-icon" style={{ background: 'rgba(16,185,129,0.15)', color: 'var(--success)' }}><HiOutlineAcademicCap /></div>
                    <div className="stat-info"><h3>Level {user?.level || 1}</h3><p>Current Level</p></div>
                </div>
                <div className="stat-card">
                    <div className="stat-icon" style={{ background: 'rgba(245,158,11,0.15)', color: 'var(--warning)' }}><HiOutlineFire /></div>
                    <div className="stat-info"><h3>{user?.streak_days || 0} days</h3><p>Streak</p></div>
                </div>
            </div>

            {/* Skills */}
            <div className="card" style={{ marginBottom: 24 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                    <h3 style={{ fontSize: 16, fontWeight: 700 }}>Skills</h3>
                    <label className="btn btn-secondary btn-sm" style={{ cursor: 'pointer' }}>
                        <HiOutlineArrowUpTray /> {uploading ? 'Uploading...' : 'Upload Resume'}
                        <input type="file" accept=".pdf" onChange={handleResume} hidden disabled={uploading} />
                    </label>
                </div>
                {resumeResult && (
                    <div className="toast toast-success" style={{ marginBottom: 12 }}>
                        {resumeResult.message}
                    </div>
                )}
                {skills.length > 0 ? (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                        {skills.map((s, i) => (
                            <span key={i} className="badge badge-info">{s.skill_name}</span>
                        ))}
                    </div>
                ) : (
                    <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>No skills detected yet. Upload your resume to extract skills.</p>
                )}
            </div>

            {/* XP History */}
            <div className="card">
                <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 16 }}><HiOutlineDocumentText style={{ verticalAlign: 'middle', marginRight: 6 }} />XP History</h3>
                {points.length === 0 ? (
                    <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>No XP transactions yet</p>
                ) : (
                    <div className="table-container">
                        <table>
                            <thead>
                                <tr><th>Action</th><th>Description</th><th style={{ textAlign: 'right' }}>XP</th><th>Date</th></tr>
                            </thead>
                            <tbody>
                                {points.slice(0, 20).map((t) => (
                                    <tr key={t.id}>
                                        <td><span className="badge badge-neutral">{t.action}</span></td>
                                        <td style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{t.description}</td>
                                        <td style={{ textAlign: 'right', fontWeight: 700, color: 'var(--success)' }}>+{t.points}</td>
                                        <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>{new Date(t.created_at).toLocaleDateString()}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
}
