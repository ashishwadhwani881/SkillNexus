import os

filepath = r'd:\Python Programs\SkillNexus\frontend\src\components\RoadmapViewer.jsx'

with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Imports
import1 = "import { HiOutlineChevronDown, HiOutlineChevronRight, HiOutlineChatBubbleLeftRight, HiOutlineAcademicCap, HiOutlineArrowLeft, HiOutlineLink, HiOutlineCheckCircle, HiOutlinePaperAirplane } from 'react-icons/hi2';"
import2 = "import { HiOutlineChevronDown, HiOutlineChevronRight, HiOutlineChatBubbleLeftRight, HiOutlineAcademicCap, HiOutlineArrowLeft, HiOutlineLink, HiOutlineCheckCircle, HiOutlinePaperAirplane, HiOutlinePlus, HiOutlinePencil, HiOutlineTrash } from 'react-icons/hi2';"
content = content.replace(import1, import2)

# 2. useAuth
useauth1 = "const { refreshUser } = useAuth();"
useauth2 = "const { user, refreshUser } = useAuth();"
content = content.replace(useauth1, useauth2)

# 3. States
states1 = '''    const [quizAnswers, setQuizAnswers] = useState({});
    const [quizResult, setQuizResult] = useState(null);
    const [sideTab, setSideTab] = useState('details');

    useEffect(() => {'''

states2 = '''    const [quizAnswers, setQuizAnswers] = useState({});
    const [quizResult, setQuizResult] = useState(null);
    const [sideTab, setSideTab] = useState('details');

    const isAdmin = user?.role === 'admin' || user?.role === 'manager';
    const [showNodeModal, setShowNodeModal] = useState(false);
    const [nodeFormMode, setNodeFormMode] = useState('add');
    const [nodeForm, setNodeForm] = useState({ title: '', description: '', position: 0 });
    const [processingNode, setProcessingNode] = useState(false);

    const openNodeModal = (mode, node = null) => {
        setNodeFormMode(mode);
        if (mode === 'edit' && node) {
            setNodeForm({ title: node.title, description: node.description || '', position: node.position || 0 });
        } else {
            setNodeForm({ title: '', description: '', position: 0 });
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
                    parent_id: selected ? selected.id : null 
                });
            } else if (nodeFormMode === 'edit') {
                await roadmapAPI.updateNode(id, selected.id, { 
                    title: nodeForm.title, 
                    description: nodeForm.description,
                    position: nodeForm.position,
                });
            }
            setShowNodeModal(false);
            const [rmRes, pRes] = await Promise.all([roadmapAPI.get(id), progressAPI.getRoadmap(id).catch(()=>({data:null}))]);
            setRoadmap(rmRes.data);
            if (pRes.data) setProgress(pRes.data);
            
            if (selected) {
               const findNode = (nodes, sid) => { for (const n of nodes) { if (n.id === sid) return n; if (n.children) { const f = findNode(n.children, sid); if (f) return f; } } return null; };
               const freshSelected = findNode(rmRes.data.nodes || [], selected.id);
               if(freshSelected) setSelected(freshSelected);
            }
        } catch (err) {
            alert(err?.response?.data?.detail || "Operation failed");
        }
        setProcessingNode(false);
    };

    const handleDeleteNode = async (nodeId) => {
        if (!confirm("Are you sure you want to delete this node and all its children?")) return;
        try {
            await roadmapAPI.deleteNode(id, nodeId);
            const [rmRes, pRes] = await Promise.all([roadmapAPI.get(id), progressAPI.getRoadmap(id).catch(()=>({data:null}))]);
            setRoadmap(rmRes.data);
            if (pRes.data) setProgress(pRes.data);
            setSelected(null);
        } catch (err) {
            alert(err?.response?.data?.detail || "Delete failed");
        }
    };

    useEffect(() => {'''
content = content.replace(states1, states2)


root_btn1 = '''                    <div>
                        <h2 style={{ fontSize: 22, fontWeight: 800 }}>{roadmap.title}</h2>
                        <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>{roadmap.category} · {roadmap.total_nodes} nodes</p>
                    </div>
                </div>'''

root_btn2 = '''                    <div>
                        <h2 style={{ fontSize: 22, fontWeight: 800 }}>{roadmap.title}</h2>
                        <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>{roadmap.category} · {roadmap.total_nodes} nodes</p>
                    </div>
                    {isAdmin && (
                        <button className="btn btn-primary btn-sm" onClick={() => { setSelected(null); openNodeModal('add'); }} style={{ marginLeft: 'auto' }}>
                            <HiOutlinePlus style={{ marginRight: 4 }} /> Add Root Node
                        </button>
                    )}
                </div>'''
content = content.replace(root_btn1, root_btn2)


admin_controls1 = '''                                <div style={{ marginTop: 24, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                                    {selected.status !== 'in_progress' && selected.status !== 'done' && (
                                        <button className="btn btn-secondary btn-sm" onClick={() => handleStatusChange('in_progress')}>Mark In Progress</button>
                                    )}
                                    {selected.status !== 'done' && (
                                        <button className="btn btn-success btn-sm" onClick={() => handleStatusChange('done')}>Mark Done</button>
                                    )}
                                    <button className="btn btn-primary btn-sm" onClick={requestQuiz} disabled={quizLoading}>
                                        <HiOutlineAcademicCap /> {quizLoading ? 'Generating...' : 'Take Quiz'}
                                    </button>
                                </div>
                            </div>'''

admin_controls2 = '''                                <div style={{ marginTop: 24, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                                    {selected.status !== 'in_progress' && selected.status !== 'done' && (
                                        <button className="btn btn-secondary btn-sm" onClick={() => handleStatusChange('in_progress')}>Mark In Progress</button>
                                    )}
                                    {selected.status !== 'done' && (
                                        <button className="btn btn-success btn-sm" onClick={() => handleStatusChange('done')}>Mark Done</button>
                                    )}
                                    <button className="btn btn-primary btn-sm" onClick={requestQuiz} disabled={quizLoading}>
                                        <HiOutlineAcademicCap /> {quizLoading ? 'Generating...' : 'Take Quiz'}
                                    </button>
                                </div>

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
                            </div>'''
content = content.replace(admin_controls1, admin_controls2)


modal_code1 = '''                )}
            </div>
        </div>
    );
}'''

modal_code2 = '''                )}
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
}'''
content = content.replace(modal_code1, modal_code2)

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)
print("Updated Viewer component successfully.")

