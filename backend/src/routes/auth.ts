import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { prisma } from '../lib/prisma';
import { signToken, requireAuth } from '../middleware/auth';

const router = Router();

// POST /api/auth/login
router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    res.status(400).json({ error: 'Email and password required' });
    return;
  }

  const user = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
  if (!user || !user.isActive) {
    res.status(401).json({ error: 'Invalid credentials' });
    return;
  }

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) {
    res.status(401).json({ error: 'Invalid credentials' });
    return;
  }

  const token = signToken({
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    teamMemberId: user.teamMemberId,
  });

  res.json({
    token,
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      teamMemberId: user.teamMemberId,
    },
  });
});

// GET /api/auth/me
router.get('/me', requireAuth, (req, res) => {
  res.json({ user: req.user });
});

// POST /api/auth/users — Admin creates user
router.post('/users', requireAuth, async (req, res) => {
  if (req.user?.role !== 'Admin') {
    res.status(403).json({ error: 'Admin only' });
    return;
  }
  const { email, password, name, role, teamMemberId } = req.body;
  if (!email || !password || !name) {
    res.status(400).json({ error: 'email, password, and name required' });
    return;
  }
  const passwordHash = await bcrypt.hash(password, 10);
  const user = await prisma.user.create({
    data: {
      email: email.toLowerCase(),
      passwordHash,
      name,
      role: role || 'TeamMember',
      teamMemberId: teamMemberId || null,
    },
    select: { id: true, email: true, name: true, role: true, teamMemberId: true, createdAt: true },
  });
  res.status(201).json(user);
});

// GET /api/auth/users — Admin lists users
router.get('/users', requireAuth, async (req, res) => {
  if (req.user?.role !== 'Admin') {
    res.status(403).json({ error: 'Admin only' });
    return;
  }
  const users = await prisma.user.findMany({
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      isActive: true,
      teamMemberId: true,
      createdAt: true,
      teamMember: { select: { name: true, role: true } },
    },
    orderBy: { name: 'asc' },
  });
  res.json(users);
});

// PUT /api/auth/users/:id
router.put('/users/:id', requireAuth, async (req, res) => {
  if (req.user?.role !== 'Admin') {
    res.status(403).json({ error: 'Admin only' });
    return;
  }
  const { password, ...rest } = req.body;
  const data: Record<string, unknown> = { ...rest };
  if (password) {
    data.passwordHash = await bcrypt.hash(password, 10);
  }
  const user = await prisma.user.update({
    where: { id: req.params.id },
    data,
    select: { id: true, email: true, name: true, role: true, isActive: true, teamMemberId: true },
  });
  res.json(user);
});

export default router;
