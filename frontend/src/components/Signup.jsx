import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { authAPI } from '../services/api';

export default function Signup() {
    const [form, setForm] = useState({ email: '', password: '', full_name: '', current_job_role: '' });
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            await authAPI.signup(form);
            navigate('/login');
        } catch (err) {
            setError(err.response?.data?.detail || 'Signup failed');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="auth-page">
            <div className="auth-card">
                <h1>Join SkillNexus</h1>
                <p className="subtitle">Start your AI-powered learning journey</p>
                {error && <div className="toast toast-error">{error}</div>}
                <form onSubmit={handleSubmit}>
                    <div className="input-group">
                        <label>Full Name</label>
                        <input className="input" name="full_name" placeholder="John Doe" value={form.full_name} onChange={handleChange} required />
                    </div>
                    <div className="input-group">
                        <label>Email</label>
                        <input className="input" type="email" name="email" placeholder="you@company.com" value={form.email} onChange={handleChange} required />
                    </div>
                    <div className="input-group">
                        <label>Password</label>
                        <input className="input" type="password" name="password" placeholder="Min 6 characters" value={form.password} onChange={handleChange} required minLength={6} />
                    </div>
                    <div className="input-group">
                        <label>Job Role</label>
                        <input className="input" name="current_job_role" placeholder="e.g. Frontend Developer" value={form.current_job_role} onChange={handleChange} />
                    </div>

                    <button className="btn btn-primary btn-lg" type="submit" disabled={loading}>
                        {loading ? 'Creating account...' : 'Create Account'}
                    </button>
                </form>
                <p className="auth-footer">
                    Already have an account? <Link to="/login">Sign in</Link>
                </p>
            </div>
        </div>
    );
}
