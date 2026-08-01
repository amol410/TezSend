const { Router } = require('express');
const { authenticate } = require('../middleware/auth');
const prisma = require('../db');

const router = Router();

router.use(authenticate);

router.post('/', async (req, res) => {
  const { token, last4, network } = req.body;
  try {
    const card = await prisma.card.create({
      data: {
        userId: req.userId,
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

router.get('/', async (req, res) => {
  try {
    const cards = await prisma.card.findMany({
      where: { userId: req.userId }
    });
    res.json(cards);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching cards', error });
  }
});

module.exports = router;
