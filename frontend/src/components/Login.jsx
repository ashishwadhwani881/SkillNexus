import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { authAPI, userAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';

export default function Login() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const { login } = useAuth();
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            const res = await authAPI.login({ email, password });
            const token = res.data.access_token;
            // Fetch full profile
            localStorage.setItem('token', token);
            const profileRes = await userAPI.getProfile();
            login(token, profileRes.data);
            navigate('/');
        } catch (err) {
            setError(err.response?.data?.detail || 'Login failed');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="auth-page">
            <div className="auth-card">
                <h1>SkillNexus</h1>
                <p className="subtitle">Sign in to your learning journey</p>
                {error && <div className="toast toast-error">{error}</div>}
                <form onSubmit={handleSubmit}>
                    <div className="input-group">
                        <label>Email</label>
                        <input className="input" type="email" placeholder="you@company.com" value={email} onChange={(e) => setEmail(e.target.value)} required />
                    </div>
                    <div className="input-group">
                        <label>Password</label>
                        <input className="input" type="password" placeholder="Enter password" value={password} onChange={(e) => setPassword(e.target.value)} required />
                    </div>
                    <button className="btn btn-primary btn-lg" type="submit" disabled={loading}>
                        {loading ? 'Signing in...' : 'Sign In'}
                    </button>
                </form>
                <p className="auth-footer">
                    Don't have an account? <Link to="/signup">Create one</Link>
                </p>
            </div>
        </div>
    );
}
