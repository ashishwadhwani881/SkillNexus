import { useState, useEffect, useRef } from 'react';
import { chatAPI } from '../../services/api';
import { HiOutlineChatBubbleLeftRight, HiOutlinePaperAirplane } from 'react-icons/hi2';
import ReactMarkdown from 'react-markdown';

export default function ChatPanel({ node, roadmapId }) {
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
