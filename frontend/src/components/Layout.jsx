import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { HiOutlineHome, HiOutlineMap, HiOutlineTrophy, HiOutlineUser, HiOutlineUsers, HiOutlineChartBar, HiOutlineCog, HiOutlineArrowRightOnRectangle } from 'react-icons/hi2';

export default function Layout() {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const isAdmin = user?.role === 'admin' || user?.role === 'ADMIN';

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    return (
        <div className="app-layout">
            <aside className="app-sidebar">
                <div className="sidebar-logo">
                    <div className="logo-icon">S</div>
                    <h1>SkillNexus</h1>
                </div>
                <nav className="sidebar-nav">
                    <div className="sidebar-section">Main</div>
                    <NavLink to="/" end className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}>
                        <HiOutlineHome /> Dashboard
                    </NavLink>
                    <NavLink to="/roadmaps" className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}>
                        <HiOutlineMap /> Roadmaps
                    </NavLink>
                    <NavLink to="/leaderboard" className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}>
                        <HiOutlineTrophy /> Leaderboard
                    </NavLink>
                    <NavLink to="/profile" className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}>
                        <HiOutlineUser /> Profile
                    </NavLink>

                    {isAdmin && (
                        <>
                            <div className="sidebar-section">Administration</div>
                            <NavLink to="/admin/users" className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}>
                                <HiOutlineUsers /> Users
                            </NavLink>
                            <NavLink to="/admin/analytics" className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}>
                                <HiOutlineChartBar /> Analytics
                            </NavLink>
                            <NavLink to="/admin/roadmaps" className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}>
                                <HiOutlineCog /> Roadmap Builder
                            </NavLink>
                        </>
                    )}
                </nav>
                <div className="sidebar-user">
                    <div className="sidebar-avatar">{user?.full_name?.[0] || 'U'}</div>
                    <div className="sidebar-user-info">
                        <p>{user?.full_name}</p>
                        <span>Level {user?.level || 1} · {user?.xp || 0} XP</span>
                    </div>
                    <button onClick={handleLogout} className="sidebar-link" style={{ padding: 8 }} title="Logout">
                        <HiOutlineArrowRightOnRectangle />
                    </button>
                </div>
            </aside>
            <main className="app-main">
                <div className="app-content">
                    <Outlet />
                </div>
            </main>
        </div>
    );
}
