import React, { useState, useEffect } from 'react'
import Header from '../components/Header'
import Footer from '../components/Footer'
import SystemMonitor from '../components/SystemMonitor'
import { authService, fetchWithAuth } from '../services/authService'
import { useTranslation } from '../context/LanguageContext'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api/v1';

function AdminDashboard() {
    const { t } = useTranslation()
    const [activeTab, setActiveTab] = useState('DASHBOARD')
    const [isRetraining, setIsRetraining] = useState(false)
    const [retrainProgress, setRetrainProgress] = useState(0)
    const [showNotification, setShowNotification] = useState(null)
    const [selectedLog, setSelectedLog] = useState(null)
    const [userToRemove, setUserToRemove] = useState(null)
    const [confirmRetrain, setConfirmRetrain] = useState(false)

    const user = authService.getCurrentUser()

    // Real Data State
    const [users, setUsers] = useState([])
    const [auditLogs, setAuditLogs] = useState([])
    const [isLoading, setIsLoading] = useState(true)

    const [dataRecords, setDataRecords] = useState([])

    const triggerNotification = (message) => {
        setShowNotification(message)
        setTimeout(() => setShowNotification(null), 3000)
    }

    const addAuditLog = async (action, user, detail, status) => {
        // Log to backend if needed, for now just update local state if safe
        console.log(`Audit: ${action} by ${user} - ${detail} [${status}]`);
    }

    const handleRemoveUser = (userId) => {
        setUserToRemove(userId);
    }

    const executeRemoveUser = async () => {
        if (!userToRemove) return;
        try {
            const response = await fetchWithAuth(`${API_URL}/admin/users/${userToRemove}`, { method: 'DELETE' });
            if (response.ok) {
                setUsers(prev => prev.filter(u => u._id !== userToRemove));
                triggerNotification('User removed successfully');
            }
        } catch (error) {
            triggerNotification('Failed to remove user');
        } finally {
            setUserToRemove(null);
        }
    }

    const handleRetrain = () => {
        setConfirmRetrain(true);
    }

    const executeRetrain = async () => {
        setConfirmRetrain(false);
        setIsRetraining(true);
        setRetrainProgress(0);

        // Start a fake progress bar for UX (since real process is async on server)
        const interval = setInterval(() => {
            setRetrainProgress(prev => (prev >= 90 ? 90 : prev + 2));
        }, 1000);

        try {
            const response = await fetchWithAuth(`${API_URL}/ml/retrain`, { method: 'POST' });
            const data = await response.json();

            clearInterval(interval);
            setRetrainProgress(100);

            if (data.success) {
                triggerNotification('Model retraining complete! New version deployed.');
                // Refresh stats to show new deployment time
                const statsRes = await fetchWithAuth(`${API_URL}/admin/stats`);
                const statsData = await statsRes.json();
                if (statsData.success) setDashboardStats(statsData.data);
            } else {
                throw new Error(data.message);
            }
        } catch (error) {
            clearInterval(interval);
            console.error("Retraining failed", error);
            triggerNotification('Failed to retrain models: ' + error.message);
        } finally {
            setTimeout(() => setIsRetraining(false), 2000);
        }
    }

    const handleExportCSV = (data, filename) => {
        const headers = Object.keys(data[0] || {}).join(',')
        const rows = data.map(row => Object.values(row).join(',')).join('\n')
        const csvContent = `data:text/csv;charset=utf-8,${headers}\n${rows}`
        const encodedUri = encodeURI(csvContent)
        const link = document.createElement('a')
        link.setAttribute('href', encodedUri)
        link.setAttribute('download', `${filename}.csv`)
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
    }

    // Load Data from Backend
    const [dashboardStats, setDashboardStats] = useState({
        activeUsers: 0,
        systemHealth: 99.9,
        modelAccuracy: 87.4,
        modelMetadata: { name: 'ForestVision_XL_v42', lastDeployed: new Date() },
        datasetStats: { total: 0, verified: 0, pending: 0 },
        storageStats: { used: 0, total: 22000, percent: 0 },
        integrityStats: { checksumsPass: true, encryption: 'AES-256', redundancy: '3 Nodes' },
        recentAlerts: []
    })

    useEffect(() => {
        const loadData = async () => {
            try {
                setIsLoading(true)
                // Fetch Users
                const usersRes = await fetchWithAuth(`${API_URL}/admin/users`)
                const usersData = await usersRes.json()
                if (usersData.success) setUsers(usersData.data)

                // Fetch Logs
                const logsRes = await fetchWithAuth(`${API_URL}/admin/logs`)
                const logsData = await logsRes.json()
                if (logsData.success) setAuditLogs(logsData.data)

                // Fetch Config
                const configRes = await fetchWithAuth(`${API_URL}/admin/config`)
                const configData = await configRes.json()
                if (configData.success) {
                    setThresholds(configData.data)
                }

                // Fetch Stats
                const statsRes = await fetchWithAuth(`${API_URL}/admin/stats`)
                const statsData = await statsRes.json()
                if (statsData.success) {
                    setDashboardStats(statsData.data)
                }

                // Fetch Data Records
                const dataRes = await fetchWithAuth(`${API_URL}/admin/data-records`)
                const dataRecordsData = await dataRes.json()
                if (dataRecordsData.success) {
                    setDataRecords(dataRecordsData.data)
                }

            } catch (error) {
                console.error("Failed to load admin data", error)
                triggerNotification('Error loading admin data: ' + error.message)
            } finally {
                setIsLoading(false)
            }
        }

        loadData()
    }, [])

    const [thresholds, setThresholds] = useState({
        deforestationRisk: { high: 80, medium: 50, low: 20 },
        retrainingInterval: 'Monthly',
        alertSensitivity: 'High'
    })

    const handleSaveConfig = async () => {
        try {
            const response = await fetchWithAuth(`${API_URL}/admin/config`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(thresholds)
            });
            const data = await response.json();
            if (data.success) {
                addAuditLog('Config Update', user.username || 'Admin', 'Risk Thresholds', 'Success');
                triggerNotification('Configuration saved successfully');
            } else {
                alert('Result:' + data.message);
            }
        } catch (error) {
            console.error("Config update failed", error);
            triggerNotification('Failed to update config');
        }
    };

    // Derived User Activity Logs from real Audit Logs
    const userActivityLogs = auditLogs
        .filter(log => [
            'ml_model_execution',
            'rf_risk_analysis',
            'cnn_satellite_analysis',
            'report_download',
            'report_generation',
            'user_login',
            'update_profile'
        ].includes(log.action))
        .map(log => {
            let detail = 'N/A';
            if (log.details) {
                if (log.details.params && log.details.params.region) {
                    detail = log.details.params.region;
                } else if (log.details.body && log.details.body.region) {
                    detail = log.details.body.region;
                } else if (log.details.params && log.details.params.filename) {
                    detail = log.details.params.filename;
                } else if (log.action === 'user_login') {
                    detail = log.ipAddress || 'Login successful';
                }
            }

            const actionLabels = {
                'ml_model_execution': 'MAP SEARCH',
                'rf_risk_analysis': 'RISK ANALYSIS',
                'cnn_satellite_analysis': 'SATELLITE ANALYSIS',
                'report_download': 'DOWNLOAD REPORT',
                'report_generation': 'GENERATE REPORT',
                'user_login': 'USER LOGIN',
                'update_profile': 'UPDATE PROFILE'
            };

            return {
                id: log._id,
                user: log.userId?.name || 'Unknown User',
                activity: actionLabels[log.action] || log.action,
                detail: detail,
                timestamp: new Date(log.timestamp).toLocaleString(),
                raw: log
            };
        });

    const handleViewLogDetails = (log) => {
        setSelectedLog(log.raw || log);
    }

    const sidebarItems = [
        { id: 'DASHBOARD', label: 'Overview', icon: '📊' },
        { id: 'MONITORING', label: 'System Monitor', icon: '📈' },
        { id: 'USERS', label: 'User Management', icon: '👥' },
        { id: 'CONFIG', label: 'Thresholds & Config', icon: '⚙️' },
        { id: 'AI_MODELS', label: 'AI Model Management', icon: '🧠' },
        { id: 'AUDIT_LOGS', label: 'Audit Logs', icon: '📜' },
        { id: 'DATA', label: 'Data Management', icon: '📁' },
    ]

    return (
        <div className="admin-dashboard-page" style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', backgroundColor: '#f8fafc' }}>
            <Header className="map-header" />

            {showNotification && (
                <div style={{
                    position: 'fixed', top: '80px', right: '20px', backgroundColor: '#0f172a', color: 'white',
                    padding: '12px 24px', borderRadius: '8px', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)',
                    zIndex: 1000, animation: 'slideInRight 0.3s ease-out'
                }}>
                    {showNotification}
                </div>
            )}

            <div style={{ display: 'flex', flex: 1, marginTop: '60px' }}>
                {/* Sidebar */}
                <div style={{
                    width: '260px',
                    backgroundColor: 'white',
                    borderRight: '1px solid #e2e8f0',
                    display: 'flex',
                    flexDirection: 'column',
                    position: 'sticky',
                    top: '60px',
                    height: 'calc(100vh - 60px)',
                    overflowY: 'auto'
                }}>
                    <div style={{ padding: '24px', borderBottom: '1px solid #f1f5f9' }}>
                        <div style={{ fontSize: '12px', fontWeight: '800', color: '#10b981', textTransform: 'uppercase', letterSpacing: '1px' }}>Control Panel</div>
                        <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#1e293b', marginTop: '4px' }}>Administrator</div>
                    </div>
                    <nav style={{ flex: 1, padding: '12px' }}>
                        {sidebarItems.map(item => (
                            <button
                                key={item.id}
                                onClick={() => setActiveTab(item.id)}
                                style={{
                                    width: '100%', display: 'flex', alignItems: 'center', gap: '12px',
                                    padding: '12px 16px', borderRadius: '8px', border: 'none',
                                    backgroundColor: activeTab === item.id ? '#f0fdf4' : 'transparent',
                                    color: activeTab === item.id ? '#10b981' : '#64748b',
                                    fontSize: '14px', fontWeight: activeTab === item.id ? '600' : '500',
                                    textAlign: 'left', cursor: 'pointer', transition: 'all 0.2s',
                                    marginBottom: '4px'
                                }}
                            >
                                <span style={{ fontSize: '18px' }}>{item.icon}</span>
                                {item.label}
                            </button>
                        ))}
                    </nav>
                    <div style={{ padding: '20px', borderTop: '1px solid #f1f5f9' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <div style={{ width: '32px', height: '32px', borderRadius: '50%', backgroundColor: '#10b981', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}>A</div>
                            <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ fontSize: '13px', fontWeight: 'bold', color: '#1e293b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{user?.username || 'Admin'}</div>
                                <div style={{ fontSize: '11px', color: '#94a3b8' }}>Super Administrator</div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Content Area */}
                <div style={{ flex: 1, padding: '32px' }}>
                    <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '24px' }}>
                            <h2 style={{ fontSize: '24px', fontWeight: '800', color: '#0f172a' }}>
                                {sidebarItems.find(i => i.id === activeTab)?.label}
                            </h2>
                            <div style={{ fontSize: '14px', color: '#64748b' }}>Admin Portal / {sidebarItems.find(i => i.id === activeTab)?.label}</div>
                        </div>

                        {/* OVERVIEW CONTENT */}
                        {activeTab === 'DASHBOARD' && (
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px' }}>
                                <div style={{ backgroundColor: 'white', padding: '24px', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', border: '1px solid #e2e8f0' }}>
                                    <div style={{ color: '#64748b', fontSize: '14px', fontWeight: '500' }}>Active Users</div>
                                    <div style={{ fontSize: '32px', fontWeight: '800', color: '#0f172a', margin: '8px 0' }}>{dashboardStats.activeUsers}</div>
                                    <div style={{ color: '#10b981', fontSize: '12px', fontWeight: 'bold' }}>Live Data From Server</div>
                                </div>
                                <div style={{ backgroundColor: 'white', padding: '24px', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', border: '1px solid #e2e8f0' }}>
                                    <div style={{ color: '#64748b', fontSize: '14px', fontWeight: '500' }}>System Health</div>
                                    <div style={{ fontSize: '32px', fontWeight: '800', color: '#10b981', margin: '8px 0' }}>{dashboardStats.systemHealth}%</div>
                                    <div style={{ color: '#64748b', fontSize: '12px', fontWeight: 'bold' }}>All systems operational</div>
                                </div>
                                <div style={{ backgroundColor: 'white', padding: '24px', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', border: '1px solid #e2e8f0' }}>
                                    <div style={{ color: '#64748b', fontSize: '14px', fontWeight: '500' }}>Model Accuracy</div>
                                    <div style={{ fontSize: '32px', fontWeight: '800', color: '#3b82f6', margin: '8px 0' }}>{dashboardStats.modelAccuracy}%</div>
                                    <div style={{ color: '#3b82f6', fontSize: '12px', fontWeight: 'bold' }}>Ver 4.2.0 deployed</div>
                                </div>

                                <div style={{ gridColumn: 'span 3', backgroundColor: 'white', padding: '24px', borderRadius: '12px', marginTop: '20px', border: '1px solid #e2e8f0' }}>
                                    <h3 style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '16px' }}>Recent System Alerts</h3>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                        {dashboardStats.recentAlerts.length > 0 ? (
                                            dashboardStats.recentAlerts.map((alert, i) => (
                                                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px', backgroundColor: '#f8fafc', borderRadius: '8px' }}>
                                                    <div style={{
                                                        padding: '4px 8px', borderRadius: '4px', fontSize: '10px', fontWeight: 'bold',
                                                        backgroundColor: alert.type === 'Warning' ? '#fef2f2' : (alert.type === 'Success' ? '#f0fdf4' : '#eff6ff'),
                                                        color: alert.type === 'Warning' ? '#dc2626' : (alert.type === 'Success' ? '#16a34a' : '#2563eb')
                                                    }}>{alert.type.toUpperCase()}</div>
                                                    <div style={{ flex: 1, fontSize: '14px', color: '#1e293b' }}>{alert.text}</div>
                                                    <div style={{ fontSize: '12px', color: '#94a3b8' }}>
                                                        {new Date(alert.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                    </div>
                                                </div>
                                            ))
                                        ) : (
                                            <div style={{ textAlign: 'center', padding: '20px', color: '#64748b', fontStyle: 'italic' }}>No recent system alerts</div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        )}

                        {activeTab === 'MONITORING' && (
                            <div style={{ flex: 1, overflowY: 'auto' }}>
                                <SystemMonitor />
                            </div>
                        )}

                        {/* USER MANAGEMENT */}
                        {activeTab === 'USERS' && (
                            <div style={{ backgroundColor: 'white', borderRadius: '12px', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
                                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                                    <thead>
                                        <tr style={{ borderBottom: '1px solid #f1f5f9', backgroundColor: '#f8fafc' }}>
                                            <th style={{ padding: '16px', fontSize: '13px', fontWeight: 'bold', color: '#64748b' }}>USER NAME</th>
                                            <th style={{ padding: '16px', fontSize: '13px', fontWeight: 'bold', color: '#64748b' }}>EMAIL</th>
                                            <th style={{ padding: '16px', fontSize: '13px', fontWeight: 'bold', color: '#64748b' }}>ROLE</th>
                                            <th style={{ padding: '16px', fontSize: '13px', fontWeight: 'bold', color: '#64748b' }}>JOINED</th>
                                            <th style={{ padding: '16px', fontSize: '13px', fontWeight: 'bold', color: '#64748b' }}>ACTION</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {users.filter(u => u.role.toLowerCase() !== 'admin').map(u => (
                                            <tr key={u._id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                                                <td style={{ padding: '16px' }}>
                                                    <div style={{ fontWeight: '600', color: '#0f172a' }}>{u.name}</div>
                                                </td>
                                                <td style={{ padding: '16px', color: '#64748b', fontSize: '14px' }}>{u.email}</td>
                                                <td style={{ padding: '16px' }}>
                                                    <span style={{
                                                        padding: '4px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: 'bold',
                                                        backgroundColor: u.role === 'Admin' ? '#fef2f2' : '#eff6ff',
                                                        color: u.role === 'Admin' ? '#dc2626' : '#2563eb'
                                                    }}>{u.role}</span>
                                                </td>
                                                <td style={{ padding: '16px', color: '#64748b', fontSize: '14px' }}>{u.joined}</td>
                                                <td style={{ padding: '16px' }}>
                                                    <button
                                                        onClick={() => handleRemoveUser(u._id)}
                                                        style={{
                                                            padding: '6px 12px', border: '1px solid #fee2e2', backgroundColor: '#fff',
                                                            color: '#dc2626', borderRadius: '6px', fontSize: '12px', fontWeight: 'bold',
                                                            cursor: 'pointer', transition: 'all 0.2s'
                                                        }}
                                                        onMouseOver={(e) => e.target.style.backgroundColor = '#fef2f2'}
                                                        onMouseOut={(e) => e.target.style.backgroundColor = '#fff'}
                                                    >
                                                        Remove
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}

                        {/* THRESHOLDS & CONFIG */}
                        {activeTab === 'CONFIG' && (
                            <div style={{ backgroundColor: 'white', padding: '32px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                                <h3 style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '24px' }}>Operational Parameters</h3>
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '32px' }}>
                                    <div>
                                        <label style={{ display: 'block', fontSize: '14px', fontWeight: 'bold', color: '#475569', marginBottom: '8px' }}>High Risk Threshold (%)</label>
                                        <input
                                            type="number"
                                            value={thresholds.deforestationRisk.high}
                                            onChange={(e) => setThresholds({ ...thresholds, deforestationRisk: { ...thresholds.deforestationRisk, high: Number(e.target.value) } })}
                                            style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none' }}
                                        />
                                    </div>
                                    <div>
                                        <label style={{ display: 'block', fontSize: '14px', fontWeight: 'bold', color: '#475569', marginBottom: '8px' }}>Medium Risk Threshold (%)</label>
                                        <input
                                            type="number"
                                            value={thresholds.deforestationRisk.medium}
                                            onChange={(e) => setThresholds({ ...thresholds, deforestationRisk: { ...thresholds.deforestationRisk, medium: Number(e.target.value) } })}
                                            style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none' }}
                                        />
                                    </div>
                                    <div>
                                        <label style={{ display: 'block', fontSize: '14px', fontWeight: 'bold', color: '#475569', marginBottom: '8px' }}>Model Retraining Interval</label>
                                        <select
                                            value={thresholds.retrainingInterval}
                                            onChange={(e) => setThresholds({ ...thresholds, retrainingInterval: e.target.value })}
                                            style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none', backgroundColor: 'white' }}
                                        >
                                            <option>Daily</option>
                                            <option>Weekly</option>
                                            <option>Monthly</option>
                                            <option>Quarterly</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label style={{ display: 'block', fontSize: '14px', fontWeight: 'bold', color: '#475569', marginBottom: '8px' }}>Alert Sensitivity</label>
                                        <select
                                            value={thresholds.alertSensitivity}
                                            onChange={(e) => setThresholds({ ...thresholds, alertSensitivity: e.target.value })}
                                            style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none', backgroundColor: 'white' }}
                                        >
                                            <option>Low</option>
                                            <option>Medium</option>
                                            <option>High</option>
                                        </select>
                                    </div>
                                </div>
                                <div style={{ marginTop: '40px', display: 'flex', justifyContent: 'flex-end' }}>
                                    <button
                                        onClick={handleSaveConfig}
                                        style={{ padding: '12px 32px', backgroundColor: '#10b981', color: 'white', borderRadius: '8px', border: 'none', fontWeight: 'bold', cursor: 'pointer' }}
                                    >
                                        Save Changes
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* AI MODEL MANAGEMENT */}
                        {activeTab === 'AI_MODELS' && (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                                <div style={{ backgroundColor: 'white', padding: '32px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
                                        <div>
                                            <h3 style={{ fontSize: '18px', fontWeight: 'bold' }}>Model Retraining Pipeline</h3>
                                            <p style={{ color: '#64748b', fontSize: '14px', marginTop: '4px' }}>Train models using newly verified field datasets</p>
                                        </div>
                                        <button
                                            onClick={handleRetrain}
                                            disabled={isRetraining}
                                            style={{
                                                padding: '12px 24px', backgroundColor: isRetraining ? '#cbd5e1' : '#0f172a',
                                                color: 'white', borderRadius: '8px', border: 'none', fontWeight: 'bold',
                                                cursor: isRetraining ? 'default' : 'pointer', display: 'flex', alignItems: 'center', gap: '8px'
                                            }}
                                        >
                                            {isRetraining ? 'Retraining...' : 'Initiate Retrain'}
                                        </button>
                                    </div>

                                    {isRetraining && (
                                        <div style={{ marginBottom: '32px' }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '13px', fontWeight: 'bold' }}>
                                                <span>Progress</span>
                                                <span>{retrainProgress}%</span>
                                            </div>
                                            <div style={{ height: '8px', backgroundColor: '#f1f5f9', borderRadius: '4px', overflow: 'hidden' }}>
                                                <div style={{ width: `${retrainProgress}%`, height: '100%', backgroundColor: '#10b981', transition: 'width 0.2s ease-out' }}></div>
                                            </div>
                                        </div>
                                    )}

                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '24px' }}>
                                        <div style={{ padding: '20px', borderRadius: '8px', backgroundColor: '#f8fafc', border: '1px solid #f1f5f9' }}>
                                            <div style={{ fontSize: '12px', color: '#64748b', fontWeight: 'bold', textTransform: 'uppercase' }}>Current Model</div>
                                            <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#0f172a', marginTop: '4px' }}>{dashboardStats.modelMetadata.name}</div>
                                            <div style={{ fontSize: '13px', color: '#10b981', marginTop: '8px' }}>
                                                Deployed {Math.max(0, Math.floor((new Date() - new Date(dashboardStats.modelMetadata.lastDeployed)) / (1000 * 60 * 60 * 24)))} days ago
                                            </div>
                                        </div>
                                        <div style={{ padding: '20px', borderRadius: '8px', backgroundColor: '#f8fafc', border: '1px solid #f1f5f9' }}>
                                            <div style={{ fontSize: '12px', color: '#64748b', fontWeight: 'bold', textTransform: 'uppercase' }}>Available Datasets</div>
                                            <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#0f172a', marginTop: '4px' }}>{dashboardStats.datasetStats.total} Total Datasets</div>
                                            <div style={{ fontSize: '13px', color: '#64748b', marginTop: '8px' }}>
                                                {dashboardStats.datasetStats.verified} Verified / {dashboardStats.datasetStats.pending} Pending
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* AUDIT LOGS */}
                        {activeTab === 'AUDIT_LOGS' && (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '30px' }}>
                                {/* SYSTEM LOGS */}
                                <div style={{ backgroundColor: 'white', borderRadius: '12px', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
                                    <div style={{ padding: '20px', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <h3 style={{ fontSize: '16px', fontWeight: 'bold', color: '#1e293b' }}>System Activity Log</h3>
                                        <button
                                            onClick={() => handleExportCSV(auditLogs, 'system_activity_logs')}
                                            style={{ fontSize: '12px', color: '#10b981', border: 'none', background: 'none', cursor: 'pointer', fontWeight: 'bold' }}
                                        >
                                            Export CSV
                                        </button>
                                    </div>
                                    <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
                                        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                                            <thead style={{ position: 'sticky', top: 0, backgroundColor: '#f8fafc', zIndex: 1 }}>
                                                <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                                                    <th style={{ padding: '16px', fontSize: '13px', fontWeight: 'bold', color: '#64748b' }}>ACTION</th>
                                                    <th style={{ padding: '16px', fontSize: '13px', fontWeight: 'bold', color: '#64748b' }}>USER</th>
                                                    <th style={{ padding: '16px', fontSize: '13px', fontWeight: 'bold', color: '#64748b' }}>TARGET</th>
                                                    <th style={{ padding: '16px', fontSize: '13px', fontWeight: 'bold', color: '#64748b' }}>TIMESTAMP</th>
                                                    <th style={{ padding: '16px', fontSize: '13px', fontWeight: 'bold', color: '#64748b' }}>STATUS</th>
                                                    <th style={{ padding: '16px', fontSize: '13px', fontWeight: 'bold', color: '#64748b' }}>ACTION</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {auditLogs
                                                    .filter(log => ![
                                                        'ml_model_execution',
                                                        'rf_risk_analysis',
                                                        'cnn_satellite_analysis',
                                                        'report_download',
                                                        'report_generation',
                                                        'user_login',
                                                        'update_profile'
                                                    ].includes(log.action))
                                                    .map(log => (
                                                        <tr key={log._id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                                                            <td style={{ padding: '16px', fontSize: '14px', fontWeight: '600' }}>{log.action.replace(/_/g, ' ').toUpperCase()}</td>
                                                            <td style={{ padding: '16px', fontSize: '14px', color: '#475569' }}>{log.userId?.name || 'System'}</td>
                                                            <td style={{ padding: '16px', fontSize: '14px', color: '#475569' }}>{log.details?.url || 'N/A'}</td>
                                                            <td style={{ padding: '16px', fontSize: '13px', color: '#94a3b8' }}>{new Date(log.timestamp).toLocaleString()}</td>
                                                            <td style={{ padding: '16px' }}>
                                                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                                    <div style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#10b981' }}></div>
                                                                    <span style={{ fontSize: '13px', color: '#10b981', fontWeight: 'bold' }}>SUCCESS</span>
                                                                </div>
                                                            </td>
                                                            <td style={{ padding: '16px' }}>
                                                                <button
                                                                    onClick={() => handleViewLogDetails(log)}
                                                                    style={{ padding: '4px 8px', fontSize: '11px', color: '#3b82f6', background: '#eff6ff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}
                                                                >
                                                                    View
                                                                </button>
                                                            </td>
                                                        </tr>
                                                    ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>

                                {/* USER LOGS */}
                                <div style={{ backgroundColor: 'white', borderRadius: '12px', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
                                    <div style={{ padding: '20px', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <h3 style={{ fontSize: '16px', fontWeight: 'bold', color: '#1e293b' }}>User Activity Log</h3>
                                        <button
                                            onClick={() => handleExportCSV(userActivityLogs, 'user_activity_logs')}
                                            style={{ fontSize: '12px', color: '#10b981', border: 'none', background: 'none', cursor: 'pointer', fontWeight: 'bold' }}
                                        >
                                            Export CSV
                                        </button>
                                    </div>
                                    <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
                                        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                                            <thead style={{ position: 'sticky', top: 0, backgroundColor: '#f8fafc', zIndex: 1 }}>
                                                <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                                                    <th style={{ padding: '16px', fontSize: '13px', fontWeight: 'bold', color: '#64748b' }}>USER</th>
                                                    <th style={{ padding: '16px', fontSize: '13px', fontWeight: 'bold', color: '#64748b' }}>ACTIVITY</th>
                                                    <th style={{ padding: '16px', fontSize: '13px', fontWeight: 'bold', color: '#64748b' }}>DETAIL</th>
                                                    <th style={{ padding: '16px', fontSize: '13px', fontWeight: 'bold', color: '#64748b' }}>TIMESTAMP</th>
                                                    <th style={{ padding: '16px', fontSize: '13px', fontWeight: 'bold', color: '#64748b' }}>ACTION</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {userActivityLogs.map(log => (
                                                    <tr key={log.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                                                        <td style={{ padding: '16px' }}>
                                                            <div style={{ fontWeight: '600', color: '#0f172a', fontSize: '14px' }}>{log.user}</div>
                                                        </td>
                                                        <td style={{ padding: '16px' }}>
                                                            <span style={{
                                                                padding: '4px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 'bold',
                                                                backgroundColor: log.activity === 'Failed Login' ? '#fef2f2' : (log.activity === 'Download Report' ? '#eff6ff' : '#f0fdf4'),
                                                                color: log.activity === 'Failed Login' ? '#dc2626' : (log.activity === 'Download Report' ? '#2563eb' : '#16a34a')
                                                            }}>{log.activity.toUpperCase()}</span>
                                                        </td>
                                                        <td style={{ padding: '16px', fontSize: '14px', color: '#475569' }}>{log.detail}</td>
                                                        <td style={{ padding: '16px', fontSize: '13px', color: '#94a3b8' }}>{log.timestamp}</td>
                                                        <td style={{ padding: '16px' }}>
                                                            <button
                                                                onClick={() => handleViewLogDetails(log)}
                                                                style={{ padding: '4px 8px', fontSize: '11px', color: '#3b82f6', background: '#eff6ff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}
                                                            >
                                                                View
                                                            </button>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* DATA MANAGEMENT */}
                        {activeTab === 'DATA' && (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '20px' }}>
                                    <div style={{ backgroundColor: 'white', padding: '24px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                                        <h4 style={{ fontSize: '16px', fontWeight: 'bold', marginBottom: '16px', color: '#1e293b' }}>Storage Overview</h4>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                                            <div style={{ width: '80px', height: '80px', borderRadius: '50%', border: '8px solid #f1f5f9', borderTopColor: '#3b82f6', display: 'flex', alignItems: 'center', justifyContent: 'center', transform: `rotate(${dashboardStats.storageStats.percent * 3.6}deg)` }}>
                                                <span style={{ transform: `rotate(-${dashboardStats.storageStats.percent * 3.6}deg)`, fontSize: '14px', fontWeight: '800' }}>{dashboardStats.storageStats.percent}%</span>
                                            </div>
                                            <div>
                                                <div style={{ fontSize: '24px', fontWeight: '800' }}>{dashboardStats.storageStats.used} GB</div>
                                                <div style={{ fontSize: '12px', color: '#64748b' }}>Used of 22 TB total</div>
                                            </div>
                                        </div>
                                    </div>
                                    <div style={{ backgroundColor: 'white', padding: '24px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                                        <h4 style={{ fontSize: '16px', fontWeight: 'bold', marginBottom: '16px', color: '#1e293b' }}>Data Integrity</h4>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                                                <span style={{ color: '#64748b' }}>Check-sums Verified</span>
                                                <span style={{ fontWeight: 'bold', color: dashboardStats.integrityStats.checksumsPass ? '#10b981' : '#f59e0b' }}>
                                                    {dashboardStats.integrityStats.checksumsPass ? 'Pass' : 'Processing'}
                                                </span>
                                            </div>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                                                <span style={{ color: '#64748b' }}>Encryption Status</span>
                                                <span style={{ fontWeight: 'bold', color: '#10b981' }}>{dashboardStats.integrityStats.encryption}</span>
                                            </div>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                                                <span style={{ color: '#64748b' }}>Backup Redundancy</span>
                                                <span style={{ fontWeight: 'bold', color: '#3b82f6' }}>{dashboardStats.integrityStats.redundancy}</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div style={{ backgroundColor: 'white', borderRadius: '12px', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
                                    <div style={{ padding: '20px', borderBottom: '1px solid #f1f5f9' }}>
                                        <h3 style={{ fontSize: '16px', fontWeight: 'bold' }}>Data Records & Versioning</h3>
                                    </div>
                                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                                        <thead>
                                            <tr style={{ borderBottom: '1px solid #f1f5f9', backgroundColor: '#f8fafc' }}>
                                                <th style={{ padding: '16px', fontSize: '13px', fontWeight: 'bold', color: '#64748b' }}>RECORD ID</th>
                                                <th style={{ padding: '16px', fontSize: '13px', fontWeight: 'bold', color: '#64748b' }}>TYPE</th>
                                                <th style={{ padding: '16px', fontSize: '13px', fontWeight: 'bold', color: '#64748b' }}>VERSION</th>
                                                <th style={{ padding: '16px', fontSize: '13px', fontWeight: 'bold', color: '#64748b' }}>SIZE</th>
                                                <th style={{ padding: '16px', fontSize: '13px', fontWeight: 'bold', color: '#64748b' }}>LAST UPDATED</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {dataRecords.map(rec => (
                                                <tr key={rec.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                                                    <td style={{ padding: '16px', fontSize: '14px', fontWeight: 'bold', color: '#3b82f6' }}>{rec.id}</td>
                                                    <td style={{ padding: '16px', fontSize: '14px', color: '#1e293b' }}>{rec.type}</td>
                                                    <td style={{ padding: '16px' }}>
                                                        <span style={{ padding: '2px 8px', backgroundColor: '#f1f5f9', borderRadius: '4px', fontSize: '12px', fontWeight: 'bold' }}>{rec.version}</span>
                                                    </td>
                                                    <td style={{ padding: '16px', fontSize: '14px', color: '#64748b' }}>{rec.size}</td>
                                                    <td style={{ padding: '16px', fontSize: '14px', color: '#64748b' }}>{rec.updated}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <style>{`
        @keyframes slideInRight {
          from { transform: translateX(100%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
        select:hover, input:hover {
          border-color: #3b82f6 !important;
        }
      `}</style>

            <Footer />

            {/* Confirmation Modal */}
            {(userToRemove || confirmRetrain) && (
                <div style={{
                    position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 3000,
                    backdropFilter: 'blur(4px)'
                }}>
                    <div style={{
                        backgroundColor: 'white', padding: '32px', borderRadius: '16px',
                        width: '90%', maxWidth: '400px', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)',
                        animation: 'slideInRight 0.3s ease-out'
                    }}>
                        <h3 style={{ fontSize: '20px', fontWeight: 'bold', color: '#0f172a', marginBottom: '16px' }}>
                            {userToRemove ? 'Remove User' : 'Initiate Model Retraining'}
                        </h3>
                        <p style={{ fontSize: '15px', color: '#475569', marginBottom: '32px', lineHeight: '1.5' }}>
                            {userToRemove 
                                ? 'Are you sure you want to remove this user? This action cannot be undone.'
                                : 'Initiating model retraining will process all verified datasets. This may take a minute. Continue?'}
                        </p>
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                            <button
                                onClick={() => { setUserToRemove(null); setConfirmRetrain(false); }}
                                style={{ padding: '10px 20px', backgroundColor: '#f1f5f9', color: '#475569', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', transition: 'background-color 0.2s' }}
                                onMouseOver={e => e.target.style.backgroundColor = '#e2e8f0'}
                                onMouseOut={e => e.target.style.backgroundColor = '#f1f5f9'}
                            >
                                Cancel
                            </button>
                            <button
                                onClick={userToRemove ? executeRemoveUser : executeRetrain}
                                style={{ padding: '10px 20px', backgroundColor: userToRemove ? '#dc2626' : '#10b981', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', transition: 'opacity 0.2s' }}
                                onMouseOver={e => e.target.style.opacity = '0.9'}
                                onMouseOut={e => e.target.style.opacity = '1'}
                            >
                                {userToRemove ? 'Remove' : 'Continue'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Log Details Modal */}
            {selectedLog && (
                <div style={{
                    position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000,
                    backdropFilter: 'blur(4px)'
                }} onClick={() => setSelectedLog(null)}>
                    <div style={{
                        backgroundColor: 'white', padding: '32px', borderRadius: '16px',
                        width: '90%', maxWidth: '500px', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)'
                    }} onClick={e => e.stopPropagation()}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                            <h3 style={{ fontSize: '20px', fontWeight: 'bold', color: '#0f172a' }}>Log Details</h3>
                            <button onClick={() => setSelectedLog(null)} style={{ background: 'none', border: 'none', fontSize: '24px', cursor: 'pointer', color: '#94a3b8' }}>&times;</button>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', maxHeight: '60vh', overflowY: 'auto', paddingRight: '8px' }}>
                            {Object.entries(selectedLog)
                                .filter(([key]) => !['_id', '__v', 'userId'].includes(key))
                                .map(([key, value]) => {
                                    const renderValue = (val) => {
                                        if (typeof val === 'object' && val !== null) {
                                            return (
                                                <div style={{ marginLeft: '12px', borderLeft: '2px solid #e2e8f0', paddingLeft: '12px', marginTop: '4px' }}>
                                                    {Object.entries(val).map(([subKey, subVal]) => (
                                                        <div key={subKey} style={{ marginBottom: '8px' }}>
                                                            <div style={{ fontSize: '11px', fontWeight: 'bold', color: '#94a3b8', textTransform: 'uppercase' }}>{subKey}</div>
                                                            <div style={{ fontSize: '13px', color: '#334155' }}>{renderValue(subVal)}</div>
                                                        </div>
                                                    ))}
                                                </div>
                                            );
                                        }
                                        return String(val);
                                    };

                                    return (
                                        <div key={key} style={{ borderBottom: '1px solid #f1f5f9', paddingBottom: '12px' }}>
                                            <div style={{ fontSize: '12px', fontWeight: '800', color: '#64748b', textTransform: 'uppercase', marginBottom: '6px', letterSpacing: '0.5px' }}>{key}</div>
                                            <div style={{ fontSize: '14px', color: '#1e293b', lineHeight: '1.5' }}>
                                                {renderValue(value)}
                                            </div>
                                        </div>
                                    );
                                })}
                        </div>
                        <button
                            onClick={() => setSelectedLog(null)}
                            style={{ width: '100%', marginTop: '32px', padding: '12px', backgroundColor: '#0f172a', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}
                        >
                            Close Details
                        </button>
                    </div>
                </div>
            )}
        </div>
    )
}

export default AdminDashboard
