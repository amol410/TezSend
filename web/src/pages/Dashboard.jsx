import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Send, ArrowUpRight, Plus, Activity, Clock, CheckCircle2, XCircle } from 'lucide-react';
import api from '../api';

export default function Dashboard() {
  const [transactions, setTransactions] = useState([]);
  const [user, setUser] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    fetchUser();
    fetchTransactions();
  }, []);

  const fetchUser = async () => {
    try {
      const res = await api.get('/auth/me');
      setUser(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchTransactions = async () => {
    try {
      const response = await api.get('/transactions/history');
      setTransactions(response.data);
    } catch (err) {
      console.error(err);
    }
  };

  const totalSent = transactions.reduce((sum, tx) => sum + (tx.status === 'SUCCESS' ? tx.amount : 0), 0);
  const totalFees = transactions.reduce((sum, tx) => sum + (tx.status === 'SUCCESS' ? tx.convenienceFee : 0), 0);

  const getStatusBadge = (status) => {
    if (status === 'SUCCESS') return <span className="badge badge-success"><CheckCircle2 size={12}/> Success</span>;
    if (status === 'FAILED') return <span className="badge badge-failed"><XCircle size={12}/> Failed</span>;
    return <span className="badge badge-pending"><Clock size={12}/> Pending</span>;
  };

  return (
    <div className="fade-in">
      <div className="section-header" style={{ marginBottom: '2rem' }}>
        <div>
          <h1 className="page-title">Welcome back, {user?.name?.split(' ')[0] || 'User'}! 👋</h1>
          <p className="page-subtitle">Here's what's happening with your rent payments.</p>
        </div>
        <button className="btn btn-primary" onClick={() => navigate('/payment')}>
          <Send size={18} /> Send Rent
        </button>
      </div>

      <div className="grid-3" style={{ marginBottom: '3rem' }}>
        <div className="stat-card blue">
          <div className="stat-label">Total Rent Sent</div>
          <div className="stat-value blue">₹{totalSent.toLocaleString()}</div>
        </div>
        <div className="stat-card purple">
          <div className="stat-label">Total Fees Paid</div>
          <div className="stat-value purple">₹{totalFees.toLocaleString()}</div>
        </div>
        <div className="stat-card green">
          <div className="stat-label">Total Transactions</div>
          <div className="stat-value green">{transactions.length}</div>
        </div>
      </div>

      <div className="section-header">
        <h2 className="section-title">Recent Transactions</h2>
        <button className="btn btn-ghost btn-sm">View All</button>
      </div>

      <div className="card">
        {transactions.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '3rem 1rem', color: 'var(--text-muted)' }}>
            <Activity size={48} style={{ opacity: 0.2, marginBottom: '1rem' }} />
            <p>No transactions yet.</p>
            <button className="btn btn-outline mt-1" onClick={() => navigate('/payment')}>
              <Plus size={16} /> Make your first payment
            </button>
          </div>
        ) : (
          <div className="gap-1">
            {transactions.map((tx) => (
              <div key={tx.id} className="tx-row">
                <div className="flex-row">
                  <div className={`tx-icon ${tx.status === 'SUCCESS' ? 'green' : tx.status === 'FAILED' ? 'red' : 'blue'}`}>
                    <ArrowUpRight size={20} />
                  </div>
                  <div>
                    <h4 style={{ margin: 0, fontWeight: 600, fontSize: '0.95rem' }}>{tx.beneficiary?.upiId || 'Rent Payment'}</h4>
                    <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                      {new Date(tx.createdAt).toLocaleDateString()} • {new Date(tx.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                    </p>
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <h4 style={{ margin: 0, fontWeight: 700, fontSize: '1.05rem', color: 'var(--text-primary)' }}>₹{tx.totalAmount.toLocaleString()}</h4>
                  {getStatusBadge(tx.status)}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
