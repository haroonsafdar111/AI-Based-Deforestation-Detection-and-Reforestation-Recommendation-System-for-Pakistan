import React, { useState, useEffect } from 'react';
import { fetchWithAuth } from '../services/authService';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api/v1';

const SystemMonitor = () => {
    const [metrics, setMetrics] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        fetchMetrics();
        // Refresh every 30 seconds
        const interval = setInterval(fetchMetrics, 30000);
        return () => clearInterval(interval);
    }, []);

    const fetchMetrics = async () => {
        try {
            const response = await fetchWithAuth(`${API_URL}/monitoring/dashboard`);
            const data = await response.json();
            if (data.success) {
                setMetrics(data.data);
            } else {
                setError(data.message || 'Failed to fetch metrics');
            }
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return <div style={{ padding: '32px', textAlign: 'center', color: '#64748b' }}>Loading system metrics...</div>;
    }

    if (error) {
        return <div style={{ padding: '32px', textAlign: 'center', color: '#dc2626' }}>Error: {error}</div>;
    }

    if (!metrics) {
        return <div style={{ padding: '32px', textAlign: 'center', color: '#64748b' }}>No metrics available</div>;
    }

    const getStatusStyle = (status) => {
        switch (status) {
            case 'excellent': return { color: '#16a34a', backgroundColor: '#f0fdf4' }; // green
            case 'good': return { color: '#2563eb', backgroundColor: '#eff6ff' }; // blue
            case 'needs_attention': return { color: '#d97706', backgroundColor: '#fffbeb' }; // yellow
            case 'needs_improvement': return { color: '#dc2626', backgroundColor: '#fef2f2' }; // red
            default: return { color: '#475569', backgroundColor: '#f8fafc' }; // gray
        }
    };

    const formatTime = (seconds) => {
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        return `${hours}h ${minutes}m`;
    };

    const cardStyle = { backgroundColor: 'white', padding: '24px', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', border: '1px solid #e2e8f0', marginBottom: '24px' };
    const gridStyle = { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '24px', marginBottom: '24px' };
    const labelStyle = { color: '#64748b', fontSize: '14px', fontWeight: '500' };
    const valueStyle = { fontSize: '16px', fontWeight: '700', color: '#0f172a' };
    const flexBetween = { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' };

    return (
        <div style={{ maxWidth: '1200px', margin: '0 auto', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
            <h1 style={{ fontSize: '24px', fontWeight: '800', color: '#0f172a', marginBottom: '24px' }}>System Performance Monitor</h1>

            {/* Overall Score */}
            <div style={cardStyle}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div>
                        <h2 style={{ fontSize: '20px', fontWeight: '700', color: '#0f172a', margin: '0 0 8px 0' }}>Overall System Health</h2>
                        <p style={{ color: '#64748b', fontSize: '14px', margin: 0 }}>Real-time performance metrics</p>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                        <div style={{ 
                            fontSize: '32px', fontWeight: '800', padding: '8px 16px', borderRadius: '8px',
                            ...getStatusStyle(metrics.status)
                        }}>
                            {metrics.overall_score}/100
                        </div>
                        <div style={{ fontSize: '14px', color: '#64748b', marginTop: '8px', textTransform: 'capitalize', fontWeight: '600' }}>
                            {metrics.status.replace('_', ' ')}
                        </div>
                    </div>
                </div>
            </div>

            {/* Key Metrics Grid */}
            <div style={gridStyle}>
                {/* API Performance */}
                <div style={{ ...cardStyle, marginBottom: 0 }}>
                    <h3 style={{ fontSize: '18px', fontWeight: '700', color: '#0f172a', marginBottom: '16px', marginTop: 0 }}>API Performance</h3>
                    <div>
                        <div style={flexBetween}>
                            <span style={labelStyle}>Response Time</span>
                            <span style={valueStyle}>{metrics.metrics.api.response_time}ms</span>
                        </div>
                        <div style={flexBetween}>
                            <span style={labelStyle}>Error Rate</span>
                            <span style={valueStyle}>{metrics.metrics.api.error_rate}%</span>
                        </div>
                        <div style={flexBetween}>
                            <span style={labelStyle}>Total Requests</span>
                            <span style={valueStyle}>{metrics.metrics.api.total_requests.toLocaleString()}</span>
                        </div>
                        <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={labelStyle}>Score</span>
                            <span style={{ padding: '4px 10px', borderRadius: '6px', fontSize: '13px', fontWeight: '700', ...getStatusStyle(metrics.metrics.api.score >= 80 ? 'excellent' : metrics.metrics.api.score >= 60 ? 'good' : 'needs_improvement') }}>
                                {metrics.metrics.api.score}/100
                            </span>
                        </div>
                    </div>
                </div>

                {/* Cache Performance */}
                <div style={{ ...cardStyle, marginBottom: 0 }}>
                    <h3 style={{ fontSize: '18px', fontWeight: '700', color: '#0f172a', marginBottom: '16px', marginTop: 0 }}>Cache Performance</h3>
                    <div>
                        <div style={flexBetween}>
                            <span style={labelStyle}>Hit Rate</span>
                            <span style={valueStyle}>{metrics.metrics.cache.hit_rate}%</span>
                        </div>
                        <div style={flexBetween}>
                            <span style={labelStyle}>Total Requests</span>
                            <span style={valueStyle}>{metrics.metrics.cache.total_requests.toLocaleString()}</span>
                        </div>
                        <div style={flexBetween}>
                            <span style={labelStyle}>Fresh Hits</span>
                            <span style={valueStyle}>{(metrics.metrics.cache.hits || 0).toLocaleString()}</span>
                        </div>
                        <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={labelStyle}>Score</span>
                            <span style={{ padding: '4px 10px', borderRadius: '6px', fontSize: '13px', fontWeight: '700', ...getStatusStyle(metrics.metrics.cache.score >= 80 ? 'excellent' : metrics.metrics.cache.score >= 60 ? 'good' : 'needs_improvement') }}>
                                {metrics.metrics.cache.score}/100
                            </span>
                        </div>
                    </div>
                </div>

                {/* ML Performance */}
                <div style={{ ...cardStyle, marginBottom: 0 }}>
                    <h3 style={{ fontSize: '18px', fontWeight: '700', color: '#0f172a', marginBottom: '16px', marginTop: 0 }}>ML Performance</h3>
                    <div>
                        <div style={flexBetween}>
                            <span style={labelStyle}>Avg Inference Time</span>
                            <span style={valueStyle}>{metrics.metrics.ml.avg_inference_time}ms</span>
                        </div>
                        <div style={flexBetween}>
                            <span style={labelStyle}>Total Inferences</span>
                            <span style={valueStyle}>{metrics.metrics.ml.total_inferences.toLocaleString()}</span>
                        </div>
                        <div style={flexBetween}>
                            <span style={labelStyle}>Python Starts</span>
                            <span style={valueStyle}>{(metrics.metrics.ml.python_process_starts || 0).toLocaleString()}</span>
                        </div>
                        <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={labelStyle}>Score</span>
                            <span style={{ padding: '4px 10px', borderRadius: '6px', fontSize: '13px', fontWeight: '700', ...getStatusStyle(metrics.metrics.ml.score >= 80 ? 'excellent' : metrics.metrics.ml.score >= 60 ? 'good' : 'needs_improvement') }}>
                                {metrics.metrics.ml.score}/100
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            {/* System Info */}
            <div style={cardStyle}>
                <h3 style={{ fontSize: '18px', fontWeight: '700', color: '#0f172a', marginBottom: '20px', marginTop: 0 }}>System Information</h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px' }}>
                    <div>
                        <div style={labelStyle}>Uptime</div>
                        <div style={{ ...valueStyle, marginTop: '4px', fontSize: '20px' }}>{formatTime(metrics.system.uptime)}</div>
                    </div>
                    <div>
                        <div style={labelStyle}>Memory Usage</div>
                        <div style={{ ...valueStyle, marginTop: '4px', fontSize: '20px' }}>{metrics.system.memory_mb} MB</div>
                    </div>
                    <div>
                        <div style={labelStyle}>Job Queues</div>
                        <div style={{ ...valueStyle, marginTop: '4px', fontSize: '20px', color: metrics.queues?.initialized ? '#16a34a' : '#dc2626' }}>
                            {metrics.queues?.initialized ? 'Active' : 'Inactive'}
                        </div>
                    </div>
                    <div>
                        <div style={labelStyle}>Redis Connection</div>
                        <div style={{ ...valueStyle, marginTop: '4px', fontSize: '20px', color: metrics.queues?.redis_connected ? '#16a34a' : '#dc2626' }}>
                            {metrics.queues?.redis_connected ? 'Connected' : 'Disconnected'}
                        </div>
                    </div>
                </div>
            </div>

            {/* Queue Status */}
            {metrics.queues?.queues && (
                <div style={cardStyle}>
                    <h3 style={{ fontSize: '18px', fontWeight: '700', color: '#0f172a', marginBottom: '20px', marginTop: 0 }}>Background Job Queues</h3>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '20px' }}>
                        {Object.entries(metrics.queues.queues).map(([queueName, stats]) => (
                            <div key={queueName} style={{ border: '1px solid #e2e8f0', borderRadius: '8px', padding: '16px', backgroundColor: '#f8fafc' }}>
                                <h4 style={{ margin: '0 0 12px 0', fontSize: '15px', fontWeight: '700', color: '#334155', textTransform: 'capitalize' }}>{queueName.replace('_', ' ')}</h4>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                        <span style={{ fontSize: '13px', color: '#64748b', fontWeight: '500' }}>Waiting:</span>
                                        <span style={{ fontSize: '13px', fontWeight: '700', color: stats.waiting > 0 ? '#d97706' : '#0f172a' }}>{stats.waiting || 0}</span>
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                        <span style={{ fontSize: '13px', color: '#64748b', fontWeight: '500' }}>Active:</span>
                                        <span style={{ fontSize: '13px', fontWeight: '700', color: stats.active > 0 ? '#2563eb' : '#0f172a' }}>{stats.active || 0}</span>
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                        <span style={{ fontSize: '13px', color: '#64748b', fontWeight: '500' }}>Completed:</span>
                                        <span style={{ fontSize: '13px', fontWeight: '700', color: stats.completed > 0 ? '#16a34a' : '#0f172a' }}>{stats.completed || 0}</span>
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                        <span style={{ fontSize: '13px', color: '#64748b', fontWeight: '500' }}>Failed:</span>
                                        <span style={{ fontSize: '13px', fontWeight: '700', color: stats.failed > 0 ? '#dc2626' : '#0f172a' }}>{stats.failed || 0}</span>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            <div style={{ textAlign: 'center', color: '#94a3b8', fontSize: '13px', marginTop: '32px' }}>
                Last updated: {new Date().toLocaleTimeString()} • Auto-refreshes every 30 seconds
            </div>
        </div>
    );
};

export default SystemMonitor;