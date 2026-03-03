import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { roadmapAPI, progressAPI, chatAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { HiOutlineChevronDown, HiOutlineChevronRight, HiOutlineChatBubbleLeftRight, HiOutlineAcademicCap, HiOutlineArrowLeft, HiOutlineLink, HiOutlineCheckCircle, HiOutlinePaperAirplane, HiOutlinePlus, HiOutlinePencil, HiOutlineTrash } from 'react-icons/hi2';
import ReactMarkdown from 'react-markdown';

function NodeTree({ nodes, selectedId, onSelect, level = 0, isAdmin = false }) {
    return (
        <div className={level > 0 ? 'tree-node-group' : ''}>
            {nodes.map((node) => (
                <NodeItem key={node.id} node={node} selectedId={selectedId} onSelect={onSelect} level={level} isAdmin={isAdmin} />
            ))}
        </div>
    );
}

function NodeItem({ node, selectedId, onSelect, level, isAdmin }) {
    const [open, setOpen] = useState(true);
    const hasChildren = node.children && node.children.length > 0;
    const statusClass = isAdmin ? '' : (node.status || 'pending');

    return (
        <div>
            <div
                className={`tree-node ${node.id === selectedId ? 'selected' : ''}`}
                onClick={() => onSelect(node)}
            >
                {level > 0 && <div className="tree-node-connector" />}
                {hasChildren ? (
                    <span onClick={(e) => { e.stopPropagation(); setOpen(!open); }} style={{ cursor: 'pointer', display: 'flex', fontSize: 14, color: 'var(--text-muted)' }}>
                        {open ? <HiOutlineChevronDown /> : <HiOutlineChevronRight />}
                    </span>
                ) : (
                    <span style={{ width: 14 }} />
                )}
                {!isAdmin && <div className={`tree-node-dot ${statusClass}`} />}
                <span style={{ flex: 1 }}>{node.title}</span>
                {!isAdmin && statusClass === 'done' && <HiOutlineCheckCircle style={{ color: 'var(--success)', fontSize: 16 }} />}
            </div>
            {hasChildren && open && (
                <NodeTree nodes={node.children} selectedId={selectedId} onSelect={onSelect} level={level + 1} isAdmin={isAdmin} />
            )}
        </div>
    );
}

function ChatPanel({ node, roadmapId, roadmapTitle }) {
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState('');
    const [sending, setSending] = useState(false);
    const [sessionId, setSessionId] = useState(null);
    const messagesEnd = useRef(null);

    useEffect(() => {
        setMessages([]);
        setSessionId(null);
        if (node) {
            chatAPI.history(node.id).then((res) => {
                if (res.data.messages?.length > 0) {
                    setMessages(res.data.messages.map(m => ({ role: m.role, content: m.content })));
                }
            }).catch(() => { });
        }
    }, [node?.id]);

    useEffect(() => {
        messagesEnd.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const sendMessage = async () => {
        if (!input.trim() || sending) return;
        const msg = input.trim();
        setInput('');
        setMessages((prev) => [...prev, { role: 'user', content: msg }]);
        setSending(true);
        try {
            const res = await chatAPI.send({
                message: msg,
                node_id: node?.id,
                roadmap_id: roadmapId,
                session_id: sessionId,
            });
            setMessages((prev) => [...prev, { role: 'assistant', content: res.data.response }]);
            setSessionId(res.data.session_id);
        } catch {
            setMessages((prev) => [...prev, { role: 'assistant', content: 'Sorry, AI is unavailable right now.' }]);
        }
        setSending(false);
    };

    return (
        <div className="chat-container">
            <div className="chat-header">
                <h3><HiOutlineChatBubbleLeftRight style={{ verticalAlign: 'middle', marginRight: 6 }} />AI Tutor</h3>
                <p>{node ? `Discussing: ${node.title}` : 'Select a node to chat'}</p>
            </div>
            <div className="chat-messages">
                {messages.length === 0 && (
                    <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-muted)', fontSize: 13 }}>
                        {node ? `Ask anything about "${node.title}"` : 'Select a node to start chatting'}
                    </div>
                )}
                {messages.map((msg, i) => (
                    <div key={i} className={`chat-bubble ${msg.role}`}>
                        <ReactMarkdown>{msg.content}</ReactMarkdown>
                    </div>
                ))}
                {sending && (
                    <div className="chat-bubble assistant" style={{ opacity: 0.6 }}>
                        <div className="spinner" style={{ width: 16, height: 16, borderWidth: 2 }} />
                    </div>
                )}
                <div ref={messagesEnd} />
            </div>
            <div className="chat-input-row">
                <input
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
                    placeholder={node ? 'Ask the AI tutor...' : 'Select a node first'}
                    disabled={!node || sending}
                />
                <button className="btn btn-primary btn-sm" onClick={sendMessage} disabled={!node || sending || !input.trim()}>
                    <HiOutlinePaperAirplane />
                </button>
            </div>
        </div>
    );
}

export default function RoadmapViewer() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { user, refreshUser } = useAuth();
    const [roadmap, setRoadmap] = useState(null);
    const [selected, setSelected] = useState(null);
    const [progress, setProgress] = useState(null);
    const [loading, setLoading] = useState(true);
    const [quizLoading, setQuizLoading] = useState(false);
    const [quiz, setQuiz] = useState(null);
    const [quizAnswers, setQuizAnswers] = useState({});
    const [quizResult, setQuizResult] = useState(null);
    const [sideTab, setSideTab] = useState('details');

    // Admin states
    const isAdmin = user?.role === 'admin' || user?.role === 'manager';
    const [showNodeModal, setShowNodeModal] = useState(false);
    const [nodeFormMode, setNodeFormMode] = useState('add');
    const [nodeForm, setNodeForm] = useState({ title: '', description: '', position: 0, resource_links: [] });
    const [processingNode, setProcessingNode] = useState(false);

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
        if (!nodeForm.title) return alert("Title is required");
        setProcessingNode(true);
        try {
            if (nodeFormMode === 'add') {
                await roadmapAPI.addNode(id, {
                    title: nodeForm.title,
                    description: nodeForm.description,
                    position: nodeForm.position,
                    resource_links: nodeForm.resource_links,
                    parent_id: selected ? selected.id : null
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
            const [rmRes, pRes] = await Promise.all([roadmapAPI.get(id), progressAPI.getRoadmap(id)]);
            setRoadmap(rmRes.data);
            if (pRes.data) setProgress(pRes.data);

            if (selected) {
                const findNode = (nodes) => { for (const n of nodes) { if (n.id === selected.id) return n; if (n.children) { const f = findNode(n.children); if (f) return f; } } return null; };
                const freshSelected = findNode(rmRes.data.nodes || []);
                setSelected(freshSelected);
            }
        } catch (err) {
            alert(err.response?.data?.detail || 'Operation failed');
        }
        setProcessingNode(false);
    };

    const handleDeleteNode = async (nodeId) => {
        if (!confirm('Are you sure you want to delete this node and all its children?')) return;
        try {
            await roadmapAPI.deleteNode(id, nodeId);
            const [rmRes, pRes] = await Promise.all([roadmapAPI.get(id), progressAPI.getRoadmap(id)]);
            setRoadmap(rmRes.data);
            if (pRes.data) setProgress(pRes.data);
            setSelected(null);
        } catch (err) {
            alert(err.response?.data?.detail || 'Delete failed');
        }
    };

    useEffect(() => {
        Promise.all([
            roadmapAPI.get(id),
            progressAPI.getRoadmap(id).catch(() => ({ data: null })),
        ]).then(([rmRes, pRes]) => {
            setRoadmap(rmRes.data);
            setProgress(pRes.data);
        }).catch(() => { }).finally(() => setLoading(false));
    }, [id]);

    const handleStatusChange = async (status) => {
        if (!selected) return;
        try {
            await progressAPI.update(selected.id, { status, quiz_passed: status === 'done' ? true : undefined });
            // Refresh data
            const [rmRes, pRes] = await Promise.all([roadmapAPI.get(id), progressAPI.getRoadmap(id)]);
            setRoadmap(rmRes.data);
            setProgress(pRes.data);
            // Find & update selected node
            const findNode = (nodes) => { for (const n of nodes) { if (n.id === selected.id) return n; if (n.children) { const f = findNode(n.children); if (f) return f; } } return null; };
            setSelected(findNode(rmRes.data.nodes || []));
            await refreshUser();
        } catch (err) {
            alert(err.response?.data?.detail || 'Failed to update');
        }
    };

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
                // Update local selected node to reflect quiz passed immediately
                setSelected(prev => ({ ...prev, quiz_passed: true }));
                // Refresh roadmap
                const rmRes = await roadmapAPI.get(id);
                setRoadmap(rmRes.data);
            }
        } catch {
            alert('Failed to verify quiz');
        }
    };

    if (loading) return <div className="loading-center"><div className="spinner" /></div>;
    if (!roadmap) return <div className="card" style={{ textAlign: 'center', padding: 40 }}>Roadmap not found</div>;

    return (
        <div className="roadmap-container">
            {/* Left: Tree */}
            <div className="roadmap-tree-panel">
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
                    <button className="btn btn-secondary btn-sm" onClick={() => navigate('/roadmaps')}>
                        <HiOutlineArrowLeft /> Back
                    </button>
                    <div>
                        <h2 style={{ fontSize: 22, fontWeight: 800 }}>{roadmap.title}</h2>
                        <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>{roadmap.category} · {roadmap.total_nodes} nodes</p>
                    </div>
                    {isAdmin && (
                        <button className="btn btn-primary btn-sm" onClick={() => { setSelected(null); openNodeModal('add'); }} style={{ marginLeft: 'auto' }}>
                            <HiOutlinePlus style={{ marginRight: 4 }} /> Add Root Node
                        </button>
                    )}
                </div>

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

                {!isAdmin && (
                    <div style={{ display: 'flex', gap: 12, marginBottom: 10, fontSize: 11, color: 'var(--text-muted)' }}>
                        <span><span className="tree-node-dot pending" style={{ display: 'inline-block', width: 8, height: 8, verticalAlign: 'middle', marginRight: 4 }} />Pending</span>
                        <span><span className="tree-node-dot in_progress" style={{ display: 'inline-block', width: 8, height: 8, verticalAlign: 'middle', marginRight: 4 }} />In Progress</span>
                        <span><span className="tree-node-dot done" style={{ display: 'inline-block', width: 8, height: 8, verticalAlign: 'middle', marginRight: 4 }} />Done</span>
                    </div>
                )}

                <NodeTree nodes={roadmap.nodes || []} selectedId={selected?.id} onSelect={setSelected} isAdmin={isAdmin} />
            </div>

            {/* Right: Side Panel */}
            <div className="roadmap-side-panel">
                {selected ? (
                    <>
                        <div style={{ borderBottom: '1px solid var(--border)' }}>
                            <div className="tabs" style={{ padding: '0 20px', marginBottom: 0, borderBottom: 'none' }}>
                                <button className={`tab ${sideTab === 'details' ? 'active' : ''}`} onClick={() => setSideTab('details')}>Details</button>
                                {!isAdmin && (
                                    <>
                                        <button className={`tab ${sideTab === 'chat' ? 'active' : ''}`} onClick={() => setSideTab('chat')}>AI Chat</button>
                                        <button className={`tab ${sideTab === 'quiz' ? 'active' : ''}`} onClick={() => setSideTab('quiz')}>Quiz</button>
                                    </>
                                )}
                            </div>
                        </div>

                        {sideTab === 'details' && (
                            <div style={{ padding: 20, overflow: 'auto', flex: 1 }}>
                                <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 12 }}>{selected.title}</h3>
                                {!isAdmin && (
                                    <span className={`badge badge-${selected.status === 'done' ? 'success' : selected.status === 'in_progress' ? 'warning' : 'neutral'}`}>
                                        {selected.status || 'pending'}
                                    </span>
                                )}
                                <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 16, lineHeight: 1.7 }}>
                                    {selected.description || 'No description provided for this node.'}
                                </p>

                                {selected.resource_links?.length > 0 && (
                                    <div style={{ marginTop: 20 }}>
                                        <h4 style={{ fontSize: 13, fontWeight: 600, marginBottom: 8, color: 'var(--text-muted)' }}>Resources</h4>
                                        {selected.resource_links.map((link, i) => (
                                            <a key={i} href={link.url} target="_blank" rel="noopener noreferrer" style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, marginBottom: 6 }}>
                                                <HiOutlineLink /> {link.title || link.url}
                                            </a>
                                        ))}
                                    </div>
                                )}

                                {!isAdmin && (
                                    <div style={{ marginTop: 24, display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                                        {selected.status !== 'in_progress' && selected.status !== 'done' && (
                                            <button className="btn btn-secondary btn-sm" onClick={() => handleStatusChange('in_progress')}>Mark In Progress</button>
                                        )}
                                        {selected.status !== 'done' && (
                                            <button
                                                className="btn btn-success btn-sm"
                                                onClick={() => handleStatusChange('done')}
                                                disabled={!selected.quiz_passed}
                                                title={!selected.quiz_passed ? 'Pass the AI quiz first to unlock completion!' : ''}
                                            >
                                                Mark Done
                                            </button>
                                        )}
                                        {selected.status !== 'done' && !selected.quiz_passed && (
                                            <button className="btn btn-primary btn-sm" onClick={requestQuiz} disabled={quizLoading}>
                                                <HiOutlineAcademicCap style={{ verticalAlign: 'text-bottom', marginRight: 4 }} /> {quizLoading ? 'Generating...' : 'Take Quiz'}
                                            </button>
                                        )}
                                        {selected.quiz_passed && selected.status !== 'done' && (
                                            <span className="badge badge-success" style={{ padding: '6px 10px', display: 'flex', alignItems: 'center', gap: 4 }}>
                                                <HiOutlineCheckCircle /> Quiz Passed
                                            </span>
                                        )}
                                    </div>
                                )}

                                {isAdmin && (
                                    <div style={{ marginTop: 24, padding: '16px', background: 'var(--bg-card-hover)', border: '1px solid var(--border)', borderRadius: 'var(--radius)' }}>
                                        <h4 style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 12 }}>Admin Controls</h4>
                                        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                                            <button className="btn btn-secondary btn-sm" onClick={() => openNodeModal('add', selected)}>
                                                <HiOutlinePlus /> Add Child
                                            </button>
                                            <button className="btn btn-secondary btn-sm" onClick={() => openNodeModal('edit', selected)}>
                                                <HiOutlinePencil /> Edit
                                            </button>
                                            <button className="btn btn-danger btn-sm" onClick={() => handleDeleteNode(selected.id)}>
                                                <HiOutlineTrash /> Delete
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        {sideTab === 'chat' && (
                            <ChatPanel node={selected} roadmapId={parseInt(id)} roadmapTitle={roadmap.title} />
                        )}

                        {sideTab === 'quiz' && (
                            <div style={{ padding: 20, overflow: 'auto', flex: 1 }}>
                                {!quiz && !quizLoading && (
                                    <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)', fontSize: 13 }}>
                                        <p>Click "Take Quiz" in the Details tab to generate a quiz for this node</p>
                                    </div>
                                )}
                                {quizLoading && <div className="loading-center"><div className="spinner" /></div>}
                                {quiz && !quizResult && (
                                    <div>
                                        <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 16 }}>Quiz: {quiz.topic}</h3>
                                        {quiz.questions.map((q, qi) => (
                                            <div key={qi} className="card" style={{ marginBottom: 12, padding: 16 }}>
                                                <p style={{ fontSize: 13, fontWeight: 600, marginBottom: 10 }}>{qi + 1}. {q.question}</p>
                                                {q.options.map((opt, oi) => (
                                                    <label key={oi} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 0', fontSize: 13, cursor: 'pointer' }}>
                                                        <input
                                                            type="radio"
                                                            name={`q${qi}`}
                                                            checked={quizAnswers[qi] === oi}
                                                            onChange={() => setQuizAnswers({ ...quizAnswers, [qi]: oi })}
                                                        />
                                                        {opt}
                                                    </label>
                                                ))}
                                            </div>
                                        ))}
                                        <button className="btn btn-primary" onClick={submitQuiz} disabled={Object.keys(quizAnswers).length < quiz.questions.length}>
                                            Submit Answers
                                        </button>
                                    </div>
                                )}
                                {quizResult && (
                                    <div>
                                        <div className={`card ${quizResult.passed ? 'badge-success' : 'badge-danger'}`} style={{ marginBottom: 16, padding: 20, textAlign: 'center', background: quizResult.passed ? 'var(--success-bg)' : 'var(--danger-bg)', border: 'none' }}>
                                            <h3 style={{ fontSize: 24, fontWeight: 800, marginBottom: 4 }}>{quizResult.score}/{quizResult.total}</h3>
                                            <p style={{ fontSize: 14 }}>{quizResult.passed ? 'Passed! +30 XP' : 'Not passed. Try again!'}</p>
                                        </div>
                                        <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.7 }}>{quizResult.feedback}</p>
                                        {!quizResult.passed ? (
                                            <button className="btn btn-secondary" style={{ marginTop: 16 }} onClick={() => { setQuiz(null); setQuizResult(null); setQuizAnswers({}); }}>
                                                Try Again
                                            </button>
                                        ) : (
                                            <button className="btn btn-primary" style={{ marginTop: 16 }} onClick={() => setSideTab('details')}>
                                                Back to Details
                                            </button>
                                        )}
                                    </div>
                                )}
                            </div>
                        )}
                    </>
                ) : (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-muted)', fontSize: 14 }}>
                        <p>Select a node to view details</p>
                    </div>
                )}
            </div>

            {/* Admin Node Form Modal */}
            {showNodeModal && (
                <div className="modal-overlay" onClick={() => setShowNodeModal(false)}>
                    <div className="modal" onClick={(e) => e.stopPropagation()}>
                        <h2>{nodeFormMode === 'add' ? (selected ? `Add Child Component` : 'Add Root Node') : 'Edit Node'}</h2>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                            <div className="input-group">
                                <label>Title</label>
                                <input className="input" autoFocus value={nodeForm.title} onChange={(e) => setNodeForm({ ...nodeForm, title: e.target.value })} placeholder="Node Title" />
                            </div>
                            <div className="input-group">
                                <label>Description</label>
                                <textarea className="input" value={nodeForm.description} onChange={(e) => setNodeForm({ ...nodeForm, description: e.target.value })} placeholder="What will they learn?" />
                            </div>
                            <div className="input-group">
                                <label>Position</label>
                                <input type="number" className="input" value={nodeForm.position} onChange={(e) => setNodeForm({ ...nodeForm, position: parseInt(e.target.value) || 0 })} placeholder="Ordering position (e.g. 0)" />
                            </div>

                            <div className="input-group">
                                <label style={{ marginBottom: 8, display: 'block' }}>Resources</label>
                                {nodeForm.resource_links.map((link, idx) => (
                                    <div key={idx} style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                                        <input className="input" style={{ flex: 1 }} value={link.title} onChange={(e) => {
                                            const newLinks = [...nodeForm.resource_links];
                                            newLinks[idx].title = e.target.value;
                                            setNodeForm({ ...nodeForm, resource_links: newLinks });
                                        }} placeholder="Title (e.g. Guide)" />
                                        <input className="input" style={{ flex: 2 }} value={link.url} onChange={(e) => {
                                            const newLinks = [...nodeForm.resource_links];
                                            newLinks[idx].url = e.target.value;
                                            setNodeForm({ ...nodeForm, resource_links: newLinks });
                                        }} placeholder="https://..." />
                                        <button className="btn btn-danger btn-sm" onClick={() => {
                                            const newLinks = nodeForm.resource_links.filter((_, i) => i !== idx);
                                            setNodeForm({ ...nodeForm, resource_links: newLinks });
                                        }}><HiOutlineTrash /></button>
                                    </div>
                                ))}
                                <button className="btn btn-secondary btn-sm" style={{ alignSelf: 'flex-start' }} onClick={() => {
                                    setNodeForm({ ...nodeForm, resource_links: [...nodeForm.resource_links, { title: '', url: '' }] });
                                }}>+ Add Resource Link</button>
                            </div>

                            <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                                <button className="btn btn-primary" onClick={handleNodeSubmit} disabled={processingNode || !nodeForm.title}>
                                    {processingNode ? 'Saving...' : 'Save'}
                                </button>
                                <button className="btn btn-secondary" onClick={() => setShowNodeModal(false)}>Cancel</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
