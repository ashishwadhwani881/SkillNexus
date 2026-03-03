import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Layout from './components/Layout';
import Login from './components/Login';
import Signup from './components/Signup';
import Dashboard from './components/Dashboard';
import Roadmaps from './components/Roadmaps';
import RoadmapViewer from './components/RoadmapViewer';
import Leaderboard from './components/Leaderboard';
import Profile from './components/Profile';
import AdminUsers from './components/AdminUsers';
import AdminAnalytics from './components/AdminAnalytics';
import AdminRoadmapBuilder from './components/AdminRoadmapBuilder';

function ProtectedRoute({ children, adminOnly = false }) {
    const { user, loading } = useAuth();
    if (loading) return <div className="loading-center"><div className="spinner" /></div>;
    if (!user) return <Navigate to="/login" />;
    if (adminOnly && user.role !== 'admin' && user.role !== 'ADMIN') return <Navigate to="/" />;
    return children;
}

function AppRoutes() {
    const { user } = useAuth();
    return (
        <Routes>
            <Route path="/login" element={user ? <Navigate to="/" /> : <Login />} />
            <Route path="/signup" element={user ? <Navigate to="/" /> : <Signup />} />
            <Route path="/" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
                <Route index element={<Dashboard />} />
                <Route path="roadmaps" element={<Roadmaps />} />
                <Route path="roadmaps/:id" element={<RoadmapViewer />} />
                <Route path="leaderboard" element={<Leaderboard />} />
                <Route path="profile" element={<Profile />} />
                <Route path="admin/users" element={<ProtectedRoute adminOnly><AdminUsers /></ProtectedRoute>} />
                <Route path="admin/analytics" element={<ProtectedRoute adminOnly><AdminAnalytics /></ProtectedRoute>} />
                <Route path="admin/roadmaps" element={<ProtectedRoute adminOnly><AdminRoadmapBuilder /></ProtectedRoute>} />
            </Route>
        </Routes>
    );
}

export default function App() {
    return (
        <BrowserRouter>
            <AuthProvider>
                <AppRoutes />
            </AuthProvider>
        </BrowserRouter>
    );
}
