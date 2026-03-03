import { useState, useEffect } from 'react';
import { leaderboardAPI } from '../services/api';
import { HiOutlineTrophy } from 'react-icons/hi2';

export default function Leaderboard() {
    const [data, setData] = useState([]);
    const [period, setPeriod] = useState('week');
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        setLoading(true);
        leaderboardAPI.get(period).then((res) => setData(res.data)).catch(() => { }).finally(() => setLoading(false));
    }, [period]);

    const getMedal = (i) => {
        if (i === 0) return { emoji: '🥇', bg: 'linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%)' };
        if (i === 1) return { emoji: '🥈', bg: 'linear-gradient(135deg, #9ca3af 0%, #6b7280 100%)' };
        if (i === 2) return { emoji: '🥉', bg: 'linear-gradient(135deg, #d97706 0%, #b45309 100%)' };
        return { emoji: `${i + 1}`, bg: 'var(--bg-card)' };
    };

    return (
        <div>
            <div className="page-header">
                <h2><HiOutlineTrophy style={{ verticalAlign: 'middle', marginRight: 8, color: 'var(--warning)' }} />Leaderboard</h2>
                <p>Top learners ranked by XP earned</p>
            </div>

            <div className="tabs">
                {['week', 'month', 'all'].map((p) => (
                    <button key={p} className={`tab ${period === p ? 'active' : ''}`} onClick={() => setPeriod(p)}>
                        {p === 'week' ? 'This Week' : p === 'month' ? 'This Month' : 'All Time'}
                    </button>
                ))}
            </div>

            {loading ? (
                <div className="loading-center"><div className="spinner" /></div>
            ) : data.length === 0 ? (
                <div className="card" style={{ textAlign: 'center', padding: 40 }}>
                    <p style={{ color: 'var(--text-muted)' }}>No data for this period</p>
                </div>
            ) : (
                <div className="table-container">
                    <table>
                        <thead>
                            <tr>
                                <th style={{ width: 60 }}>Rank</th>
                                <th>Learner</th>
                                <th>Role</th>
                                <th style={{ textAlign: 'right' }}>XP</th>
                                <th style={{ textAlign: 'right' }}>Level</th>
                            </tr>
                        </thead>
                        <tbody>
                            {data.map((entry, i) => {
                                const medal = getMedal(i);
                                return (
                                    <tr key={entry.user_id}>
                                        <td>
                                            <div style={{ width: 32, height: 32, borderRadius: 'var(--radius-full)', background: medal.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: i < 3 ? 16 : 12, fontWeight: 700, color: i < 3 ? '#000' : 'var(--text-secondary)' }}>
                                                {i < 3 ? medal.emoji : i + 1}
                                            </div>
                                        </td>
                                        <td>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                                <div className="sidebar-avatar" style={{ width: 32, height: 32, fontSize: 12 }}>
                                                    {entry.full_name?.[0] || '?'}
                                                </div>
                                                <div>
                                                    <p style={{ fontWeight: 600, fontSize: 13 }}>{entry.full_name}</p>
                                                    <p style={{ fontSize: 11, color: 'var(--text-muted)' }}>{entry.current_job_role || 'Learner'}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td><span className="badge badge-info">{entry.role}</span></td>
                                        <td style={{ textAlign: 'right', fontWeight: 700, color: 'var(--accent-primary)' }}>{entry.xp}</td>
                                        <td style={{ textAlign: 'right', fontWeight: 600 }}>{entry.level}</td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}
