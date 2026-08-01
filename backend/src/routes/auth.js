const { Router } = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { OAuth2Client } = require('google-auth-library');
const prisma = require('../db');
const { authenticate } = require('../middleware/auth');
const { firebaseApp } = require('../firebaseAdmin');
const { getAuth } = require('firebase-admin/auth');

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret-key';
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || 'YOUR_GOOGLE_CLIENT_ID';
const googleClient = new OAuth2Client(GOOGLE_CLIENT_ID);

const signToken = (userId) =>
  jwt.sign({ userId }, JWT_SECRET, { expiresIn: '7d' });

// ─── Register with email + password ──────────────────────────────────────────
router.post('/register', async (req, res) => {
  const { name, email, password, phone } = req.body;

  if (!email || !password || !name) {
    return res.status(400).json({ message: 'Name, email and password are required' });
  }

  try {
    const existing = await prisma.user.findFirst({
      where: { OR: [{ email }, ...(phone ? [{ phone }] : [])] }
    });

    if (existing) {
      return res.status(400).json({ message: 'User with this email already exists' });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: { name, email, passwordHash, ...(phone ? { phone } : {}) }
    });

    const token = signToken(user.id);
    const { passwordHash: _, ...safeUser } = user;
    res.status(201).json({ token, user: safeUser });
  } catch (error) {
    res.status(500).json({ message: 'Error creating user', error });
  }
});

// ─── Login with email + password ─────────────────────────────────────────────
router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: 'Email and password are required' });
  }

  try {
    const user = await prisma.user.findUnique({ where: { email } });

    if (!user || !user.passwordHash) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    const isValid = await bcrypt.compare(password, user.passwordHash);
    if (!isValid) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    const token = signToken(user.id);
    const { passwordHash: _, ...safeUser } = user;
    res.json({ token, user: safeUser });
  } catch (error) {
    res.status(500).json({ message: 'Error logging in', error });
  }
});

// ─── Google OAuth ─────────────────────────────────────────────────────────────
router.post('/google', async (req, res) => {
  const { idToken } = req.body;

  if (!idToken) {
    return res.status(400).json({ message: 'Google ID token is required' });
  }

  try {
    const ticket = await googleClient.verifyIdToken({
      idToken,
      audience: GOOGLE_CLIENT_ID
    });

    const payload = ticket.getPayload();
    if (!payload || !payload.email) {
      return res.status(401).json({ message: 'Invalid Google token' });
    }

    const { sub: googleId, email, name, picture: avatar } = payload;

    // Find by Google ID or email (links account if already registered)
    let user = await prisma.user.findFirst({
      where: { OR: [{ googleId }, { email }] }
    });

    if (!user) {
      user = await prisma.user.create({
        data: { googleId, email, name, avatar }
      });
    } else if (!user.googleId) {
      // Link Google to existing email account
      user = await prisma.user.update({
        where: { id: user.id },
        data: { googleId, avatar: avatar || user.avatar }
      });
    }

    const token = signToken(user.id);
    const { passwordHash: _, ...safeUser } = user;
    res.json({ token, user: safeUser });
  } catch (error) {
    console.error('Google auth error:', error);
    res.status(401).json({ message: 'Google authentication failed' });
  }
});

// ─── Firebase-backed Google sign-in (accepts Firebase ID token) ──────────────
router.post('/firebase-google', async (req, res) => {
  const { idToken } = req.body;

  if (!idToken) {
    return res.status(400).json({ message: 'Firebase ID token is required' });
  }

  try {
    const decodedToken = await getAuth(firebaseApp).verifyIdToken(idToken);
    const email = decodedToken.email;
    const firebaseUid = decodedToken.uid;
    const name = decodedToken.name || 'Firebase User';
    const avatar = decodedToken.picture || null;

    if (!email) return res.status(401).json({ message: 'Invalid Firebase token (no email)' });

    let user = await prisma.user.findFirst({ where: { OR: [{ email }, { googleId: firebaseUid }] } });

    if (!user) {
      user = await prisma.user.create({ data: { googleId: firebaseUid, email, name, avatar } });
    } else if (!user.googleId) {
      user = await prisma.user.update({ where: { id: user.id }, data: { googleId: firebaseUid, avatar: avatar || user.avatar } });
    }

    const token = signToken(user.id);
    const { passwordHash: _, ...safeUser } = user;
    res.json({ token, user: safeUser });
  } catch (error) {
    console.error('Firebase Google auth error:', error?.message || error);
    res.status(401).json({ message: 'Firebase Google authentication failed', detail: error?.message });
  }
});

// ─── Firebase Phone Auth ──────────────────────────────────────────────────────
router.post('/firebase-phone', async (req, res) => {
  const { idToken } = req.body;

  if (!idToken) {
    return res.status(400).json({ message: 'Firebase ID token is required' });
  }

  try {
    // Pass the explicit app instance to getAuth() to avoid the global
    // 'default app' registry lookup that causes 'app/no-app' errors.
    const decodedToken = await getAuth(firebaseApp).verifyIdToken(idToken);
    const phone = decodedToken.phone_number;

    if (!phone) {
      return res.status(400).json({ message: 'No phone number associated with this Firebase account' });
    }

    // Find or create user
    let user = await prisma.user.findFirst({
      where: { phone }
    });

    if (!user) {
      // Create new user (using Firebase UID as a pseudo-password or leaving it null)
      user = await prisma.user.create({
        data: {
          phone,
          // Generate a placeholder email since it's required by our DB schema
          email: `${phone.replace('+', '')}@tezsend-app.internal`,
          name: 'Mobile User'
        }
      });
    }

    const token = signToken(user.id);
    const { passwordHash: _, ...safeUser } = user;
    res.json({ token, user: safeUser });
  } catch (error) {
    console.error('Firebase Phone auth error (code):', error?.code);
    console.error('Firebase Phone auth error (message):', error?.message);
    console.error('Firebase Phone auth error (full):', error);
    res.status(401).json({ message: 'Firebase authentication failed', detail: error?.message });
  }
});

// ─── Mock Phone Auth (Bypass Firebase) ────────────────────────────────────────
router.post('/mock-phone', async (req, res) => {
  const { phone } = req.body;

  if (!phone) {
    return res.status(400).json({ message: 'Phone number is required' });
  }

  try {
    let user = await prisma.user.findFirst({ where: { phone } });
    if (!user) {
      user = await prisma.user.create({
        data: {
          phone,
          email: `${phone.replace('+', '')}@tezsend-mock.internal`,
          name: 'Mock Mobile User'
        }
      });
    }

    const token = signToken(user.id);
    const { passwordHash: _, ...safeUser } = user;
    res.json({ token, user: safeUser });
  } catch (error) {
    res.status(500).json({ message: 'Mock authentication failed' });
  }
});


// ─── Get current user ─────────────────────────────────────────────────────────
router.get('/me', authenticate, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.userId },
      select: {
        id: true, name: true, email: true, phone: true, avatar: true,
        googleId: true, createdAt: true
      }
    });
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json(user);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching user', error });
  }
});

// ─── Link phone to an existing account (post email/Google signup) ─────────────
router.post('/link-phone', authenticate, async (req, res) => {
  const { idToken } = req.body;

  if (!idToken) {
    return res.status(400).json({ message: 'Firebase ID token is required' });
  }

  try {
    const decodedToken = await getAuth(firebaseApp).verifyIdToken(idToken);
    const phone = decodedToken.phone_number;

    if (!phone) {
      return res.status(400).json({ message: 'No phone number associated with this Firebase token' });
    }

    // Check the phone isn't already taken by a different account
    const existing = await prisma.user.findFirst({ where: { phone, NOT: { id: req.userId } } });
    if (existing) {
      return res.status(409).json({ message: 'This phone number is already linked to another account' });
    }

    const user = await prisma.user.update({
      where: { id: req.userId },
      data: { phone },
      select: { id: true, name: true, email: true, phone: true, avatar: true, googleId: true, createdAt: true }
    });

    res.json({ message: 'Phone number linked successfully', user });
  } catch (error) {
    console.error('Link phone error:', error?.message);
    res.status(401).json({ message: 'Phone verification failed', detail: error?.message });
  }
});

module.exports = router;
