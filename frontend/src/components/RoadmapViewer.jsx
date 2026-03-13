import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { roadmapAPI, progressAPI, chatAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { HiOutlineArrowLeft, HiOutlinePlus } from 'react-icons/hi2';

// Sub-components (Single Responsibility)
import NodeTree from './roadmap-viewer/NodeTree';
import ChatPanel from './roadmap-viewer/ChatPanel';
import NodeDetails from './roadmap-viewer/NodeDetails';
import QuizPanel from './roadmap-viewer/QuizPanel';
import AdminNodeForm from './roadmap-viewer/AdminNodeForm';

/** Recursively find a node by id in a nested tree. */
function findNodeById(nodes, id) {
    for (const n of nodes) {
        if (n.id === id) return n;
        if (n.children) {
            const found = findNodeById(n.children, id);
            if (found) return found;
        }
    }
    return null;
}

export default function RoadmapViewer() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { user, refreshUser } = useAuth();

    // ── Core Data ──
    const [roadmap, setRoadmap] = useState(null);
    const [progress, setProgress] = useState(null);
    const [loading, setLoading] = useState(true);

    // ── Selected Node ──
    const [selected, setSelected] = useState(null);
    const [sideTab, setSideTab] = useState('details');

    // ── Quiz State ──
    const [quiz, setQuiz] = useState(null);
    const [quizLoading, setQuizLoading] = useState(false);
    const [quizAnswers, setQuizAnswers] = useState({});
    const [quizResult, setQuizResult] = useState(null);

    // ── Learning Timer ──
    const [remainingTime, setRemainingTime] = useState(0);
    const REQUIRED_LEARNING_SECONDS = 120;

    // ── Admin Node Form ──
    const isAdmin = user?.role === 'admin' || user?.role === 'manager';
    const [showNodeModal, setShowNodeModal] = useState(false);
    const [nodeFormMode, setNodeFormMode] = useState('add');
    const [nodeForm, setNodeForm] = useState({ title: '', description: '', position: 0, resource_links: [] });
    const [processingNode, setProcessingNode] = useState(false);

    // ── Data Fetching ──
    useEffect(() => {
        Promise.all([
            roadmapAPI.get(id),
            progressAPI.getRoadmap(id).catch(() => ({ data: null })),
        ]).then(([rmRes, pRes]) => {
            setRoadmap(rmRes.data);
            setProgress(pRes.data);
        }).catch(() => { }).finally(() => setLoading(false));
    }, [id]);

    // ── Reset quiz panel on node change ──
    useEffect(() => {
        setQuiz(null);
        setQuizAnswers({});
        setQuizResult(null);
        setSideTab('details');
    }, [selected?.id]);

    // ── Learning Timer ──
    useEffect(() => {
        const isLeaf = selected && (!selected.children || selected.children.length === 0);
        if (!isLeaf || selected.status !== 'in_progress' || !selected.started_at) {
            setRemainingTime(0);
            return;
        }
        const calcRemaining = () => {
            const raw = selected.started_at;
            const started = new Date(raw.endsWith('Z') ? raw : raw + 'Z').getTime();
            const elapsed = (Date.now() - started) / 1000;
            return Math.max(0, Math.ceil(REQUIRED_LEARNING_SECONDS - elapsed));
        };
        setRemainingTime(calcRemaining());
        const interval = setInterval(() => {
            const r = calcRemaining();
            setRemainingTime(r);
            if (r <= 0) clearInterval(interval);
        }, 1000);
        return () => clearInterval(interval);
    }, [selected?.id, selected?.status, selected?.started_at]);

    const timerReady = remainingTime <= 0;
    const formatTime = (s) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

    // ── Refresh helper ──
    const refreshRoadmap = async () => {
        const [rmRes, pRes] = await Promise.all([roadmapAPI.get(id), progressAPI.getRoadmap(id)]);
        setRoadmap(rmRes.data);
        if (pRes.data) setProgress(pRes.data);
        return rmRes.data;
    };

    // ── Status Change ──
    const handleStatusChange = async (status) => {
        if (!selected) return;
        try {
            await progressAPI.update(selected.id, { status, quiz_passed: status === 'done' ? true : undefined });
            const freshRoadmap = await refreshRoadmap();
            setSelected(findNodeById(freshRoadmap.nodes || [], selected.id));
            await refreshUser();
        } catch (err) {
            alert(err.response?.data?.detail || 'Failed to update');
        }
    };

    // ── Quiz ──
    const requestQuiz = async () => {
        if (!selected) return;
        setQuizLoading(true);
        setQuizResult(null);
        setQuizAnswers({});
        try {
            const res = await chatAPI.quiz(selected.id, 3);
            setQuiz(res.data);
            setSideTab('quiz');
        } catch {
            alert('Failed to generate quiz');
        }
        setQuizLoading(false);
    };

    const submitQuiz = async () => {
        if (!quiz) return;
        const answers = quiz.questions.map((_, i) => quizAnswers[i] ?? -1);
        try {
            const res = await chatAPI.verifyQuiz({ session_id: quiz.session_id, node_id: selected.id, answers });
            setQuizResult(res.data);
            if (res.data.passed) {
                await refreshUser();
                setSelected(prev => ({ ...prev, quiz_passed: true }));
                const freshRoadmap = await refreshRoadmap();
                setRoadmap(freshRoadmap);
            }
        } catch {
            alert('Failed to verify quiz');
        }
    };

    // ── Admin Node Form ──
    const openNodeModal = (mode, node = null) => {
        setNodeFormMode(mode);
        if (mode === 'edit' && node) {
            setNodeForm({ title: node.title, description: node.description || '', position: node.position || 0, resource_links: node.resource_links || [] });
        } else {
            setNodeForm({ title: '', description: '', position: 0, resource_links: [] });
        }
        setShowNodeModal(true);
    };

    const handleNodeSubmit = async () => {
        if (!nodeForm.title) return alert('Title is required');
        setProcessingNode(true);
        try {
            if (nodeFormMode === 'add') {
                await roadmapAPI.addNode(id, {
                    title: nodeForm.title,
                    description: nodeForm.description,
                    position: nodeForm.position,
                    resource_links: nodeForm.resource_links,
                    parent_id: selected ? selected.id : null,
                });
            } else if (nodeFormMode === 'edit') {
                await roadmapAPI.updateNode(id, selected.id, {
                    title: nodeForm.title,
                    description: nodeForm.description,
                    position: nodeForm.position,
                    resource_links: nodeForm.resource_links,
                });
            }
            setShowNodeModal(false);
            const freshRoadmap = await refreshRoadmap();
            if (selected) setSelected(findNodeById(freshRoadmap.nodes || [], selected.id));
        } catch (err) {
            alert(err.response?.data?.detail || 'Operation failed');
        }
        setProcessingNode(false);
    };

    const handleDeleteNode = async (nodeId) => {
        if (!confirm('Are you sure you want to delete this node and all its children?')) return;
        try {
            await roadmapAPI.deleteNode(id, nodeId);
            await refreshRoadmap();
            setSelected(null);
        } catch (err) {
            alert(err.response?.data?.detail || 'Delete failed');
        }
    };

    // ── Render Guards ──
    if (loading) return <div className="loading-center"><div className="spinner" /></div>;
    if (!roadmap) return <div className="card" style={{ textAlign: 'center', padding: 40 }}>Roadmap not found</div>;

    return (
        <div className="roadmap-container">
            {/* ── Left: Node Tree Panel ── */}
            <div className="roadmap-tree-panel">
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
                    <button className="btn btn-secondary btn-sm" onClick={() => navigate('/roadmaps')}>
                        <HiOutlineArrowLeft /> Back
                    </button>
                    <div>
                        <h2 style={{ fontSize: 22, fontWeight: 800 }}>{roadmap.title}</h2>
                        <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>{roadmap.category} · {roadmap.total_nodes} nodes</p>
                    </div>
                    {isAdmin && !roadmap.is_published && (
                        <button className="btn btn-primary btn-sm" onClick={() => { setSelected(null); openNodeModal('add'); }} style={{ marginLeft: 'auto' }}>
                            <HiOutlinePlus style={{ marginRight: 4 }} /> Add Root Node
                        </button>
                    )}
                </div>

                {/* Progress Summary (Learner only) */}
                {!isAdmin && progress && (
                    <div className="card" style={{ marginBottom: 20, padding: 16 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                            <span style={{ fontSize: 13, fontWeight: 600 }}>Overall Progress</span>
                            <span style={{ fontSize: 13, color: 'var(--accent-primary)', fontWeight: 700 }}>{progress.progress_pct}%</span>
                        </div>
                        <div className="progress-bar">
                            <div className="progress-fill" style={{ width: `${progress.progress_pct}%` }} />
                        </div>
                        <div style={{ display: 'flex', gap: 16, marginTop: 10, fontSize: 12, color: 'var(--text-muted)' }}>
                            <span style={{ color: 'var(--success)' }}>● {progress.completed_nodes} done</span>
                            <span style={{ color: 'var(--warning)' }}>● {progress.in_progress_nodes} in progress</span>
                            <span>● {progress.pending_nodes} pending</span>
                        </div>
                    </div>
                )}

                {/* Status Legend (Learner only) */}
                {!isAdmin && (
                    <div style={{ display: 'flex', gap: 12, marginBottom: 10, fontSize: 11, color: 'var(--text-muted)' }}>
                        <span><span className="tree-node-dot pending" style={{ display: 'inline-block', width: 8, height: 8, verticalAlign: 'middle', marginRight: 4 }} />Pending</span>
                        <span><span className="tree-node-dot in_progress" style={{ display: 'inline-block', width: 8, height: 8, verticalAlign: 'middle', marginRight: 4 }} />In Progress</span>
                        <span><span className="tree-node-dot done" style={{ display: 'inline-block', width: 8, height: 8, verticalAlign: 'middle', marginRight: 4 }} />Done</span>
                    </div>
                )}

                <NodeTree
                    nodes={roadmap.nodes || []}
                    selectedId={selected?.id}
                    onSelect={setSelected}
                    isAdmin={isAdmin}
                />
            </div>

            {/* ── Right: Side Panel ── */}
            <div className="roadmap-side-panel">
                {selected ? (
                    <>
                        {/* Tab Bar */}
                        <div style={{ borderBottom: '1px solid var(--border)' }}>
                            <div className="tabs" style={{ padding: '0 20px', marginBottom: 0, borderBottom: 'none' }}>
                                <button className={`tab ${sideTab === 'details' ? 'active' : ''}`} onClick={() => setSideTab('details')}>Details</button>
                                {!isAdmin && (
                                    <>
                                        <button className={`tab ${sideTab === 'chat' ? 'active' : ''}`} onClick={() => setSideTab('chat')}>AI Chat</button>
                                        {(!selected.children || selected.children.length === 0) && (
                                            <button className={`tab ${sideTab === 'quiz' ? 'active' : ''}`} onClick={() => setSideTab('quiz')}>Quiz</button>
                                        )}
                                    </>
                                )}
                            </div>
                        </div>

                        {/* Tab Panels */}
                        {sideTab === 'details' && (
                            <NodeDetails
                                selected={selected}
                                isAdmin={isAdmin}
                                isPublished={roadmap.is_published}
                                timerReady={timerReady}
                                remainingTime={remainingTime}
                                formatTime={formatTime}
                                quizLoading={quizLoading}
                                onStatusChange={handleStatusChange}
                                onRequestQuiz={requestQuiz}
                                onOpenNodeModal={openNodeModal}
                                onDeleteNode={handleDeleteNode}
                            />
                        )}
                        {sideTab === 'chat' && (
                            <ChatPanel node={selected} roadmapId={parseInt(id)} />
                        )}
                        {sideTab === 'quiz' && (
                            <QuizPanel
                                quiz={quiz}
                                quizLoading={quizLoading}
                                quizResult={quizResult}
                                quizAnswers={quizAnswers}
                                onAnswerChange={(qi, oi) => setQuizAnswers({ ...quizAnswers, [qi]: oi })}
                                onSubmitQuiz={submitQuiz}
                                onRetry={() => { setQuiz(null); setQuizResult(null); setQuizAnswers({}); }}
                                onBackToDetails={() => setSideTab('details')}
                            />
                        )}
                    </>
                ) : (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-muted)', fontSize: 14 }}>
                        <p>Select a node to view details</p>
                    </div>
                )}
            </div>

            {/* ── Admin Node Modal ── */}
            <AdminNodeForm
                show={showNodeModal}
                mode={nodeFormMode}
                nodeForm={nodeForm}
                processing={processingNode}
                selectedNode={selected}
                onClose={() => setShowNodeModal(false)}
                onSubmit={handleNodeSubmit}
                onFormChange={setNodeForm}
            />
        </div>
    );
}
