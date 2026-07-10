import { Router } from 'express';
import { authenticate, AuthRequest } from '../middleware/auth';
import prisma from '../db';

const router = Router();

router.use(authenticate);

router.post('/', async (req: AuthRequest, res) => {
  const { type, upiId, accountNo, ifsc, bankName } = req.body;
  try {
    const beneficiary = await prisma.beneficiary.create({
      data: {
        userId: req.userId!,
        type,
        upiId,
        accountNo,
        ifsc,
        bankName
      }
    });
    res.json(beneficiary);
  } catch (error) {
    res.status(500).json({ message: 'Error adding beneficiary', error });
  }
});

router.get('/', async (req: AuthRequest, res) => {
  try {
    const beneficiaries = await prisma.beneficiary.findMany({
      where: { userId: req.userId! }
    });
    res.json(beneficiaries);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching beneficiaries', error });
  }
});

export default router;
