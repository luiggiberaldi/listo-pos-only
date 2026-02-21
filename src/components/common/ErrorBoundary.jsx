import React from 'react';

/**
 * 🛡️ ERROR BOUNDARY — Production Crash Protection
 * Catches render errors in child components and shows a recovery UI
 * instead of a white screen. Logs errors for Ghost diagnostics.
 */
class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null, errorInfo: null };
    }

    static getDerivedStateFromError(error) {
        return { hasError: true, error };
    }

    componentDidCatch(error, errorInfo) {
        this.setState({ errorInfo });

        // Log for Ghost Eye diagnostics
        if (window.ghostErrors) {
            window.ghostErrors.push({
                message: `[ErrorBoundary] ${error.message}`,
                stack: error.stack,
                componentStack: errorInfo?.componentStack,
                timestamp: Date.now()
            });
        }

        // Production logging (non-blocking)
        if (!import.meta.env.DEV) {
            try {
                const { db } = require('../../../db');
                db?.logs?.add({
                    tipo: 'ERROR_BOUNDARY',
                    fecha: new Date().toISOString(),
                    producto: 'SISTEMA',
                    cantidad: 0,
                    detalle: error.message,
                    meta: {
                        stack: error.stack?.substring(0, 500),
                        component: errorInfo?.componentStack?.substring(0, 300),
                        section: this.props.section || 'unknown'
                    }
                }).catch(() => { });
            } catch { /* non-critical */ }
        }
    }

    handleRecover = () => {
        this.setState({ hasError: false, error: null, errorInfo: null });
    };

    handleGoHome = () => {
        this.setState({ hasError: false, error: null, errorInfo: null });
        window.location.hash = '#/';
    };

    render() {
        if (this.state.hasError) {
            return (
                <div style={{
                    minHeight: '60vh',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '2rem',
                    fontFamily: 'system-ui, -apple-system, sans-serif'
                }}>
                    <div style={{
                        maxWidth: '480px',
                        textAlign: 'center',
                        background: 'var(--color-surface, #1e293b)',
                        borderRadius: '16px',
                        padding: '2.5rem',
                        boxShadow: '0 4px 24px rgba(0,0,0,0.3)',
                        border: '1px solid rgba(255,255,255,0.1)'
                    }}>
                        <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>⚠️</div>
                        <h2 style={{
                            color: '#f59e0b',
                            fontSize: '1.25rem',
                            fontWeight: 700,
                            marginBottom: '0.75rem'
                        }}>
                            {this.props.title || 'Ocurrió un error inesperado'}
                        </h2>
                        <p style={{
                            color: '#94a3b8',
                            fontSize: '0.9rem',
                            lineHeight: 1.5,
                            marginBottom: '1.5rem'
                        }}>
                            {this.props.section === 'pos'
                                ? 'El módulo de ventas encontró un problema. Tu carrito no se ha perdido.'
                                : 'La sección encontró un problema. Tus datos están seguros.'
                            }
                        </p>

                        {import.meta.env.DEV && this.state.error && (
                            <details style={{
                                textAlign: 'left',
                                marginBottom: '1.5rem',
                                background: 'rgba(239,68,68,0.1)',
                                borderRadius: '8px',
                                padding: '0.75rem',
                                fontSize: '0.75rem',
                                color: '#ef4444',
                                maxHeight: '150px',
                                overflow: 'auto'
                            }}>
                                <summary style={{ cursor: 'pointer', fontWeight: 600 }}>
                                    Debug Info
                                </summary>
                                <pre style={{ whiteSpace: 'pre-wrap', marginTop: '0.5rem' }}>
                                    {this.state.error.message}
                                    {'\n\n'}
                                    {this.state.error.stack?.substring(0, 400)}
                                </pre>
                            </details>
                        )}

                        <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center' }}>
                            <button
                                onClick={this.handleRecover}
                                style={{
                                    background: '#3b82f6',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '10px',
                                    padding: '0.6rem 1.5rem',
                                    fontSize: '0.9rem',
                                    fontWeight: 600,
                                    cursor: 'pointer'
                                }}
                            >
                                🔄 Reintentar
                            </button>
                            <button
                                onClick={this.handleGoHome}
                                style={{
                                    background: 'transparent',
                                    color: '#94a3b8',
                                    border: '1px solid rgba(255,255,255,0.15)',
                                    borderRadius: '10px',
                                    padding: '0.6rem 1.5rem',
                                    fontSize: '0.9rem',
                                    fontWeight: 600,
                                    cursor: 'pointer'
                                }}
                            >
                                🏠 Ir al Inicio
                            </button>
                        </div>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}

export default ErrorBoundary;
