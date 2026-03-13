import { useState } from 'react';
import { HiOutlineChevronDown, HiOutlineChevronRight, HiOutlineCheckCircle } from 'react-icons/hi2';

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

export default function NodeTree({ nodes, selectedId, onSelect, level = 0, isAdmin = false }) {
    return (
        <div className={level > 0 ? 'tree-node-group' : ''}>
            {nodes.map((node) => (
                <NodeItem key={node.id} node={node} selectedId={selectedId} onSelect={onSelect} level={level} isAdmin={isAdmin} />
            ))}
        </div>
    );
}
