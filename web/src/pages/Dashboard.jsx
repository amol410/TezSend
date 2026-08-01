import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api';
import DashboardCards from '../components/DashboardCards';
import TransactionsList from '../components/TransactionsList';

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

  return (
    <div className="fade-in">
      <div className="section-header" style={{ marginBottom: '1rem' }}>
        <div>
          <h1 className="page-title">Welcome back, {user?.name?.split(' ')[0] || 'User'}!</h1>
          <p className="page-subtitle">Your secure rent payments dashboard.</p>
        </div>
        <button className="btn btn-primary" onClick={() => navigate('/payment')}>Pay Rent</button>
      </div>

      <DashboardCards totalSent={totalSent} totalFees={totalFees} transactionsCount={transactions.length} onPay={() => navigate('/payment')} />

      <div style={{ marginTop: '1.5rem' }}>
        <TransactionsList transactions={transactions} />
      </div>
    </div>
  );
}
