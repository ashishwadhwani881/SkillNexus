import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';

const api = axios.create({
    baseURL: API_BASE,
    headers: { 'Content-Type': 'application/json' },
});

// Attach JWT token to every request
api.interceptors.request.use((config) => {
    const token = localStorage.getItem('token');
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
});

// Redirect to login on 401
api.interceptors.response.use(
    (res) => res,
    (err) => {
        if (err.response?.status === 401) {
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            window.location.href = '/login';
        }
        return Promise.reject(err);
    }
);

// --- Auth ---
export const authAPI = {
    signup: (data) => api.post('/auth/signup', data),
    login: (data) => api.post('/auth/login', data),
};

// --- Users ---
export const userAPI = {
    getProfile: () => api.get('/users/me'),
    updateProfile: (data) => api.put('/users/me', data),
    uploadResume: (file) => {
        const fd = new FormData();
        fd.append('file', file);
        return api.post('/users/me/resume', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
    },
    getPoints: () => api.get('/users/me/points'),
};

// --- Leaderboard ---
export const leaderboardAPI = {
    get: (period = 'week', limit = 20) => api.get(`/leaderboard?period=${period}&limit=${limit}`),
};

// --- Roadmaps ---
export const roadmapAPI = {
    list: (category) => api.get(`/roadmaps${category ? `?category=${category}` : ''}`),
    myRoadmaps: () => api.get('/roadmaps/my-roadmaps'),
    get: (id) => api.get(`/roadmaps/${id}`),
    create: (data) => api.post('/roadmaps', data),
    update: (id, data) => api.put(`/roadmaps/${id}`, data),
    delete: (id) => api.delete(`/roadmaps/${id}`),
    addNode: (id, data) => api.post(`/roadmaps/${id}/nodes`, data),
    updateNode: (id, nodeId, data) => api.put(`/roadmaps/${id}/nodes/${nodeId}`, data),
    deleteNode: (id, nodeId) => api.delete(`/roadmaps/${id}/nodes/${nodeId}`),
    importJSON: (id, data) => api.post(`/roadmaps/${id}/import`, data),
    exportJSON: (id) => api.get(`/roadmaps/${id}/export`),
    generate: (prompt) => api.post('/roadmaps/generate', { prompt }),
};

// --- Progress ---
export const progressAPI = {
    update: (nodeId, data) => api.put(`/progress/${nodeId}`, data),
    getRoadmap: (roadmapId) => api.get(`/progress/roadmap/${roadmapId}`),
};

// --- Chat ---
export const chatAPI = {
    send: (data) => api.post('/chat', data),
    history: (nodeId, sessionId) => {
        const params = new URLSearchParams();
        if (nodeId) params.append('node_id', nodeId);
        if (sessionId) params.append('session_id', sessionId);
        return api.get(`/chat/history?${params}`);
    },
    quiz: (nodeId, numQuestions = 3) => api.post('/chat/quiz', { node_id: nodeId, num_questions: numQuestions }),
    verifyQuiz: (data) => api.post('/chat/quiz/verify', data),
};

// --- Admin ---
export const adminAPI = {
    assign: (userId, roadmapId) => api.post(`/admin/assign?user_id=${userId}&roadmap_id=${roadmapId}`),
    bulkAssign: (userIds, roadmapId) => api.post(`/admin/assign/bulk?roadmap_id=${roadmapId}`, userIds),
    analytics: (roadmapId) => api.get(`/admin/analytics${roadmapId ? `?roadmap_id=${roadmapId}` : ''}`),
    skillGaps: (roadmapId) => api.get(`/admin/skill-gaps?roadmap_id=${roadmapId}`),
    users: (role) => api.get(`/admin/users${role ? `?role=${role}` : ''}`),
    userRoadmaps: (userId) => api.get(`/admin/user/${userId}/roadmaps`),
};

export default api;
