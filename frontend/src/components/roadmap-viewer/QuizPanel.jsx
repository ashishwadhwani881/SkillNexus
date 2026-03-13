export default function QuizPanel({
    quiz,
    quizLoading,
    quizResult,
    quizAnswers,
    onAnswerChange,
    onSubmitQuiz,
    onRetry,
    onBackToDetails,
}) {
    return (
        <div style={{ padding: 20, overflow: 'auto', flex: 1 }}>
            {!quiz && !quizLoading && (
                <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)', fontSize: 13 }}>
                    <p>Click "Take Quiz" in the Details tab to generate a quiz for this node</p>
                </div>
            )}
            {quizLoading && <div className="loading-center"><div className="spinner" /></div>}

            {/* Active Quiz Questions */}
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
                                        onChange={() => onAnswerChange(qi, oi)}
                                    />
                                    {opt}
                                </label>
                            ))}
                        </div>
                    ))}
                    <button
                        className="btn btn-primary"
                        onClick={onSubmitQuiz}
                        disabled={Object.keys(quizAnswers).length < quiz.questions.length}
                    >
                        Submit Answers
                    </button>
                </div>
            )}

            {/* Quiz Result */}
            {quizResult && (
                <div>
                    <div
                        className="card"
                        style={{ marginBottom: 16, padding: 20, textAlign: 'center', background: quizResult.passed ? 'var(--success-bg)' : 'var(--danger-bg)', border: 'none' }}
                    >
                        <h3 style={{ fontSize: 24, fontWeight: 800, marginBottom: 4 }}>{quizResult.score}/{quizResult.total}</h3>
                        <p style={{ fontSize: 14 }}>{quizResult.passed ? 'Passed! +30 XP' : 'Not passed. Try again!'}</p>
                    </div>
                    <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.7 }}>{quizResult.feedback}</p>
                    {!quizResult.passed ? (
                        <button className="btn btn-secondary" style={{ marginTop: 16 }} onClick={onRetry}>
                            Try Again
                        </button>
                    ) : (
                        <button className="btn btn-primary" style={{ marginTop: 16 }} onClick={onBackToDetails}>
                            Back to Details
                        </button>
                    )}
                </div>
            )}
        </div>
    );
}
