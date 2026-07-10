import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CreditCard, IndianRupee, ShieldCheck, Check, ArrowRight } from 'lucide-react';
import api from '../api';

export default function Payment() {
  const [step, setStep] = useState(1);
  const [upiId, setUpiId] = useState('');
  const [amount, setAmount] = useState('');
  const [feeDetails, setFeeDetails] = useState(null);
  const [cardAdded, setCardAdded] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleAddCardMock = async () => {
    try {
      await api.post('/cards', { token: 'mock_token_123', last4: '4242', network: 'Visa' });
      setCardAdded(true);
      setTimeout(() => setStep(2), 600);
    } catch (err) {
      alert('Failed to add card');
    }
  };

  const handleCalculateFee = async (e) => {
    const val = e.target.value;
    setAmount(val);
    if (!val || isNaN(val)) {
      setFeeDetails(null);
      return;
    }
    
    try {
      const response = await api.post('/transactions/calculate-fee', { amount: parseFloat(val) });
      setFeeDetails(response.data);
    } catch (err) {
      console.error(err);
    }
  };

  const handlePay = async () => {
    if (!upiId || !amount) return;
    setLoading(true);
    
    try {
      const benRes = await api.post('/beneficiaries', { type: 'UPI', upiId });
      const txRes = await api.post('/transactions/initiate', {
        beneficiaryId: benRes.data.id,
        amount: parseFloat(amount)
      });

      // Mock Airpay flow
      setTimeout(() => {
        setLoading(false);
        alert(`Payment of ₹${txRes.data.totalAmount} Successful via Airpay!\nOrder ID: ${txRes.data.airpayOrderId}`);
        navigate('/');
      }, 1500);
      
    } catch (err) {
      setLoading(false);
      alert('Payment initiation failed');
    }
  };

  return (
    <div className="fade-in" style={{ maxWidth: '600px', margin: '0 auto' }}>
      <h1 className="page-title text-center" style={{ textAlign: 'center' }}>Send Rent</h1>
      <p className="page-subtitle text-center" style={{ textAlign: 'center' }}>Complete your payment in 3 simple steps.</p>

      {/* Stepper */}
      <div className="stepper">
        <div className={`step ${step >= 1 ? (step > 1 ? 'done' : 'active') : ''}`}>
          <div className="step-num">{step > 1 ? <Check size={16}/> : '1'}</div>
          <div className="step-label">Payment Method</div>
        </div>
        <div className={`step-connector ${step > 1 ? 'done' : ''}`}></div>
        
        <div className={`step ${step >= 2 ? (step > 2 ? 'done' : 'active') : ''}`}>
          <div className="step-num">{step > 2 ? <Check size={16}/> : '2'}</div>
          <div className="step-label">Beneficiary</div>
        </div>
        <div className={`step-connector ${step > 2 ? 'done' : ''}`}></div>
        
        <div className={`step ${step >= 3 ? 'active' : ''}`}>
          <div className="step-num">3</div>
          <div className="step-label">Amount & Pay</div>
        </div>
      </div>

      <div className="card">
        {step === 1 && (
          <div className="fade-in">
            <h3 style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <CreditCard size={20} color="var(--brand)"/> Select Card
            </h3>
            {cardAdded ? (
              <div className="card-elevated flex-row" style={{ border: '1px solid var(--green)' }}>
                <ShieldCheck size={24} color="var(--green)" />
                <div>
                  <h4 style={{ margin: 0 }}>Visa ending in 4242</h4>
                  <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Ready to use</p>
                </div>
              </div>
            ) : (
              <div className="card-elevated" style={{ textAlign: 'center', padding: '2rem' }}>
                <CreditCard size={32} color="var(--text-muted)" style={{ marginBottom: '1rem' }} />
                <p style={{ marginBottom: '1.5rem', color: 'var(--text-secondary)' }}>You don't have any saved cards.</p>
                <button className="btn btn-outline" onClick={handleAddCardMock}>
                  Add New Card
                </button>
              </div>
            )}
            {cardAdded && (
              <button className="btn btn-primary btn-full mt-2" onClick={() => setStep(2)}>
                Continue <ArrowRight size={18} />
              </button>
            )}
          </div>
        )}

        {step === 2 && (
          <div className="fade-in">
            <h3 style={{ marginBottom: '1rem' }}>Beneficiary Details</h3>
            <div className="form-group">
              <label className="form-label">Landlord's UPI ID</label>
              <input 
                type="text" 
                className="form-input" 
                placeholder="e.g. landlord@okhdfcbank"
                value={upiId}
                onChange={(e) => setUpiId(e.target.value)}
                autoFocus
              />
            </div>
            <div className="flex-row mt-2">
              <button className="btn btn-ghost" onClick={() => setStep(1)}>Back</button>
              <button 
                className="btn btn-primary" 
                style={{ flex: 1 }}
                disabled={!upiId}
                onClick={() => setStep(3)}
              >
                Continue <ArrowRight size={18} />
              </button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="fade-in">
            <h3 style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <IndianRupee size={20} color="var(--brand)"/> Transfer Amount
            </h3>
            <div className="form-group">
              <input 
                type="number" 
                className="form-input" 
                style={{ fontSize: '1.5rem', padding: '1rem', textAlign: 'center', fontWeight: 600 }}
                placeholder="₹ 0.00"
                value={amount}
                onChange={handleCalculateFee}
                autoFocus
              />
            </div>

            {feeDetails && (
              <div className="card-elevated mt-1">
                <div className="fee-row">
                  <span>Transfer Amount</span>
                  <span>₹{feeDetails.amount.toLocaleString()}</span>
                </div>
                <div className="fee-row">
                  <span>Convenience Fee (2%)</span>
                  <span>₹{feeDetails.convenienceFee.toLocaleString()}</span>
                </div>
                <div className="fee-row total">
                  <span>Total Payable</span>
                  <span className="fee-amount">₹{feeDetails.totalAmount.toLocaleString()}</span>
                </div>
              </div>
            )}

            <div className="flex-row mt-2">
              <button className="btn btn-ghost" onClick={() => setStep(2)}>Back</button>
              <button 
                className="btn btn-primary" 
                style={{ flex: 1 }}
                disabled={!amount || loading}
                onClick={handlePay}
              >
                {loading ? <span className="spinner"></span> : `Pay ₹${feeDetails?.totalAmount?.toLocaleString() || '0'}`}
              </button>
            </div>
            
            <p style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.75rem', marginTop: '1.5rem' }}>
              Payments are securely processed via Airpay. RBI compliance enforced.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
