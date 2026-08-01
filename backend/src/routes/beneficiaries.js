const { Router } = require('express');
const { authenticate } = require('../middleware/auth');
const prisma = require('../db');

const router = Router();

router.use(authenticate);

router.post('/', async (req, res) => {
  const { type, upiId, accountNo, ifsc, bankName } = req.body;
  try {
    const beneficiary = await prisma.beneficiary.create({
      data: {
        userId: req.userId,
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

router.get('/', async (req, res) => {
  try {
    const beneficiaries = await prisma.beneficiary.findMany({
      where: { userId: req.userId }
    });
    res.json(beneficiaries);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching beneficiaries', error });
  }
});

module.exports = router;
