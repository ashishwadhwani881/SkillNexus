import { HiOutlineLink, HiOutlineCheckCircle, HiOutlineAcademicCap, HiOutlinePlus, HiOutlinePencil, HiOutlineTrash } from 'react-icons/hi2';

export default function NodeDetails({
    selected,
    isAdmin,
    isPublished,
    timerReady,
    remainingTime,
    formatTime,
    quizLoading,
    onStatusChange,
    onRequestQuiz,
    onOpenNodeModal,
    onDeleteNode,
}) {
    const isLeaf = !selected.children || selected.children.length === 0;

    return (
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

            {/* Resource Links */}
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

            {/* Learner Action Buttons */}
            {!isAdmin && isLeaf && (
                <div style={{ marginTop: 24 }}>
                    {/* Learning timer indicator */}
                    {selected.status === 'in_progress' && !timerReady && (
                        <div style={{ marginBottom: 14, padding: '10px 14px', background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)', borderRadius: 'var(--radius)', display: 'flex', alignItems: 'center', gap: 10 }}>
                            <div className="spinner" style={{ width: 14, height: 14, borderWidth: 2, borderColor: 'var(--warning)', borderTopColor: 'transparent' }} />
                            <span style={{ fontSize: 13, color: 'var(--warning)' }}>
                                Learning in progress — <strong>{formatTime(remainingTime)}</strong> remaining before quiz unlocks
                            </span>
                        </div>
                    )}
                    {selected.status === 'in_progress' && timerReady && !selected.quiz_passed && (
                        <div style={{ marginBottom: 14, padding: '10px 14px', background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.2)', borderRadius: 'var(--radius)', fontSize: 13, color: 'var(--success)' }}>
                            ✓ Learning time complete! You can now take the quiz.
                        </div>
                    )}

                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                        {selected.status !== 'in_progress' && selected.status !== 'done' && (
                            <button className="btn btn-secondary btn-sm" onClick={() => onStatusChange('in_progress')}>Mark In Progress</button>
                        )}
                        {selected.status !== 'done' && (
                            <button
                                className="btn btn-success btn-sm"
                                onClick={() => onStatusChange('done')}
                                disabled={!selected.quiz_passed || !timerReady}
                                title={!timerReady ? `Wait ${formatTime(remainingTime)} to finish learning` : !selected.quiz_passed ? 'Pass the AI quiz first!' : ''}
                            >
                                Mark Done
                            </button>
                        )}
                        {selected.status !== 'done' && !selected.quiz_passed && (
                            <button
                                className="btn btn-primary btn-sm"
                                onClick={onRequestQuiz}
                                disabled={quizLoading || !timerReady}
                                title={!timerReady ? `Quiz unlocks in ${formatTime(remainingTime)}` : ''}
                            >
                                <HiOutlineAcademicCap style={{ verticalAlign: 'text-bottom', marginRight: 4 }} />
                                {quizLoading ? 'Generating...' : !timerReady ? `Quiz in ${formatTime(remainingTime)}` : 'Take Quiz'}
                            </button>
                        )}
                        {selected.quiz_passed && selected.status !== 'done' && (
                            <span className="badge badge-success" style={{ padding: '6px 10px', display: 'flex', alignItems: 'center', gap: 4 }}>
                                <HiOutlineCheckCircle /> Quiz Passed
                            </span>
                        )}
                    </div>
                </div>
            )}

            {/* Parent node notice (for learners with children) */}
            {!isAdmin && !isLeaf && (
                <div style={{ marginTop: 24, padding: 14, background: 'rgba(59,130,246,0.08)', border: '1px solid rgba(59,130,246,0.15)', borderRadius: 'var(--radius)', fontSize: 13, color: 'var(--info)', lineHeight: 1.6 }}>
                    <strong>Parent Node</strong> — This node's status updates automatically when all its child nodes are completed. Complete the leaf nodes below to progress.
                </div>
            )}

            {/* Admin Controls */}
            {isAdmin && !isPublished && (
                <div style={{ marginTop: 24, padding: '16px', background: 'var(--bg-card-hover)', border: '1px solid var(--border)', borderRadius: 'var(--radius)' }}>
                    <h4 style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 12 }}>Admin Controls</h4>
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                        <button className="btn btn-secondary btn-sm" onClick={() => onOpenNodeModal('add', selected)}>
                            <HiOutlinePlus /> Add Child
                        </button>
                        <button className="btn btn-secondary btn-sm" onClick={() => onOpenNodeModal('edit', selected)}>
                            <HiOutlinePencil /> Edit
                        </button>
                        <button className="btn btn-danger btn-sm" onClick={() => onDeleteNode(selected.id)}>
                            <HiOutlineTrash /> Delete
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
