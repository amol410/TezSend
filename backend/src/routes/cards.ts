import { Router } from 'express';
import { authenticate, AuthRequest } from '../middleware/auth';
import prisma from '../db';

const router = Router();

router.use(authenticate);

router.post('/', async (req: AuthRequest, res) => {
  const { token, last4, network } = req.body;
  try {
    const card = await prisma.card.create({
      data: {
        userId: req.userId!,
        token,
        last4,
        network
      }
    });
    res.json(card);
  } catch (error) {
    res.status(500).json({ message: 'Error adding card', error });
  }
});

router.get('/', async (req: AuthRequest, res) => {
  try {
    const cards = await prisma.card.findMany({
      where: { userId: req.userId! }
    });
    res.json(cards);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching cards', error });
  }
});

export default router;
