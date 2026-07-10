import { Router } from 'express';
import { authenticate, AuthRequest } from '../middleware/auth';
import prisma from '../db';
import crypto from 'crypto';

const router = Router();

// 2% convenience fee for MVP
const CONVENIENCE_FEE_RATE = 0.02;

router.use(authenticate);

router.post('/calculate-fee', (req: AuthRequest, res) => {
  const { amount } = req.body;
  if (!amount || amount <= 0) {
    return res.status(400).json({ message: 'Invalid amount' });
  }

  const convenienceFee = amount * CONVENIENCE_FEE_RATE;
  const totalAmount = amount + convenienceFee;

  res.json({
    amount,
    convenienceFee,
    totalAmount
  });
});

router.post('/initiate', async (req: AuthRequest, res) => {
  const { beneficiaryId, amount } = req.body;
  
  if (!beneficiaryId || !amount) {
    return res.status(400).json({ message: 'Missing required fields' });
  }

  const convenienceFee = amount * CONVENIENCE_FEE_RATE;
  const totalAmount = amount + convenienceFee;

  try {
    // 1. Create transaction record in DB
    const transaction = await prisma.transaction.create({
      data: {
        userId: req.userId!,
        beneficiaryId,
        amount,
        convenienceFee,
        totalAmount,
        status: 'PENDING'
      }
    });

    // 2. Mock Airpay order creation
    // In a real scenario, you would call the Airpay API here.
    const mockAirpayOrderId = `AIRPAY_${crypto.randomBytes(8).toString('hex').toUpperCase()}`;

    // Update transaction with Airpay order ID
    await prisma.transaction.update({
      where: { id: transaction.id },
      data: { airpayOrderId: mockAirpayOrderId }
    });

    // Return the required details for the client to proceed with Airpay checkout
    res.json({
      transactionId: transaction.id,
      airpayOrderId: mockAirpayOrderId,
      totalAmount,
      currency: 'INR'
    });

  } catch (error) {
    res.status(500).json({ message: 'Error initiating transaction', error });
  }
});

router.get('/history', async (req: AuthRequest, res) => {
  try {
    const transactions = await prisma.transaction.findMany({
      where: { userId: req.userId! },
      include: { beneficiary: true },
      orderBy: { createdAt: 'desc' }
    });
    res.json(transactions);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching transactions', error });
  }
});

export default router;
