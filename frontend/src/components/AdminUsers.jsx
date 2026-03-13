import { useState, useEffect } from 'react';
import { adminAPI, roadmapAPI } from '../services/api';
import { HiOutlineUsers, HiOutlineMap } from 'react-icons/hi2';

export default function AdminUsers() {
    const [users, setUsers] = useState([]);
    const [roadmaps, setRoadmaps] = useState([]);
    const [loading, setLoading] = useState(true);
    const [assignModal, setAssignModal] = useState(null);
    const [selectedRoadmap, setSelectedRoadmap] = useState('');
    const [assigning, setAssigning] = useState(false);
    const [message, setMessage] = useState('');

    // Create User state
    const [createModal, setCreateModal] = useState(false);
    const [createForm, setCreateForm] = useState({ full_name: '', email: '', password: '', role: 'learner' });
    const [creating, setCreating] = useState(false);

    useEffect(() => {
        Promise.all([adminAPI.users(), roadmapAPI.list()])
            .then(([uRes, rRes]) => { setUsers(uRes.data.users || []); setRoadmaps(rRes.data || []); })
            .catch(() => { })
            .finally(() => setLoading(false));
    }, []);

    const handleAssign = async () => {
        if (!selectedRoadmap || !assignModal) return;
        setAssigning(true);
        try {
            const res = await adminAPI.assign(assignModal.id, parseInt(selectedRoadmap));
            setMessage(res.data.message);
            setAssignModal(null);
            setSelectedRoadmap('');
        } catch (err) {
            setMessage(err.response?.data?.detail || 'Assignment failed');
        }
        setAssigning(false);
    };

    const handleCreateUser = async (e) => {
        e.preventDefault();
        setCreating(true);
        try {
            const res = await adminAPI.createUser(createForm);
            setMessage(`Successfully created user ${res.data.full_name} as ${res.data.role}`);
            setCreateModal(false);
            setCreateForm({ full_name: '', email: '', password: '', role: 'learner' });
            // Refresh users list
            const uRes = await adminAPI.users();
            setUsers(uRes.data.users || []);
        } catch (err) {
            setMessage(err.response?.data?.detail || 'Failed to create user');
        }
        setCreating(false);
    };

    return (
        <div>
            <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                    <h2><HiOutlineUsers style={{ verticalAlign: 'middle', marginRight: 8 }} />User Management</h2>
                    <p>Manage learners and assign roadmaps</p>
                </div>
                <button className="btn btn-primary" onClick={() => setCreateModal(true)}>
                    + Create User
                </button>
            </div>

            {message && <div className="toast toast-success">{message}</div>}

            {loading ? (
                <div className="loading-center"><div className="spinner" /></div>
            ) : (
                <div className="table-container">
                    <table>
                        <thead>
                            <tr>
                                <th>User</th>
                                <th>Email</th>
                                <th>Role</th>
                                <th>XP</th>
                                <th>Level</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {users.map((u) => (
                                <tr key={u.id}>
                                    <td>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                            <div className="sidebar-avatar" style={{ width: 32, height: 32, fontSize: 12 }}>{u.full_name?.[0]}</div>
                                            <div>
                                                <p style={{ fontWeight: 600, fontSize: 13 }}>{u.full_name}</p>
                                                <p style={{ fontSize: 11, color: 'var(--text-muted)' }}>{u.current_job_role || '-'}</p>
                                            </div>
                                        </div>
                                    </td>
                                    <td style={{ fontSize: 13 }}>{u.email}</td>
                                    <td><span className={`badge badge-${u.role === 'admin' ? 'danger' : u.role === 'manager' ? 'warning' : 'info'}`}>{u.role}</span></td>
                                    <td style={{ fontWeight: 700 }}>{u.xp}</td>
                                    <td>Lv. {u.level}</td>
                                    <td>
                                        {u.role === 'learner' && (
                                            <button className="btn btn-primary btn-sm" onClick={() => setAssignModal(u)}>
                                                <HiOutlineMap /> Assign
                                            </button>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Assign Modal */}
            {assignModal && (
                <div className="modal-overlay" onClick={() => setAssignModal(null)}>
                    <div className="modal" onClick={(e) => e.stopPropagation()}>
                        <h2>Assign Roadmap to {assignModal.full_name}</h2>
                        <div className="input-group" style={{ marginBottom: 20 }}>
                            <label>Select Roadmap</label>
                            {roadmaps.filter(rm => rm.is_published).length === 0 ? (
                                <p style={{ fontSize: 13, color: 'var(--text-muted)', padding: '8px 0' }}>
                                    No published roadmaps available. Publish a roadmap first.
                                </p>
                            ) : (
                                <select className="input" value={selectedRoadmap} onChange={(e) => setSelectedRoadmap(e.target.value)}>
                                    <option value="">-- Choose a published roadmap --</option>
                                    {roadmaps.filter(rm => rm.is_published).map((rm) => (
                                        <option key={rm.id} value={rm.id}>{rm.title}</option>
                                    ))}
                                </select>
                            )}
                        </div>
                        <div style={{ display: 'flex', gap: 8 }}>
                            <button className="btn btn-primary" onClick={handleAssign} disabled={!selectedRoadmap || assigning}>
                                {assigning ? 'Assigning...' : 'Assign'}
                            </button>
                            <button className="btn btn-secondary" onClick={() => setAssignModal(null)}>Cancel</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Create User Modal */}
            {createModal && (
                <div className="modal-overlay" onClick={() => setCreateModal(false)}>
                    <div className="modal" onClick={(e) => e.stopPropagation()}>
                        <h2>Create New User</h2>
                        <form onSubmit={handleCreateUser}>
                            <div className="input-group">
                                <label>Full Name</label>
                                <input className="input" required value={createForm.full_name} onChange={(e) => setCreateForm({ ...createForm, full_name: e.target.value })} placeholder="Jane Doe" />
                            </div>
                            <div className="input-group">
                                <label>Email</label>
                                <input className="input" type="email" required value={createForm.email} onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })} placeholder="jane@company.com" />
                            </div>
                            <div className="input-group">
                                <label>Password</label>
                                <input className="input" type="password" required value={createForm.password} onChange={(e) => setCreateForm({ ...createForm, password: e.target.value })} placeholder="Min 6 characters" minLength={6} />
                            </div>
                            <div className="input-group" style={{ marginBottom: 20 }}>
                                <label>Role</label>
                                <select className="input" value={createForm.role} onChange={(e) => setCreateForm({ ...createForm, role: e.target.value })}>
                                    <option value="learner">Learner</option>
                                    <option value="manager">Manager</option>
                                    <option value="admin">Admin</option>
                                </select>
                            </div>
                            <div style={{ display: 'flex', gap: 8 }}>
                                <button type="submit" className="btn btn-primary" disabled={creating}>
                                    {creating ? 'Creating...' : 'Create User'}
                                </button>
                                <button type="button" className="btn btn-secondary" onClick={() => setCreateModal(false)}>Cancel</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
