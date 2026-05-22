import express from 'express';
import cors from 'cors';
import pg from 'pg';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';

const { Pool } = pg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://petrdospiva@localhost:5432/sparorez',
  max: 5,
});

const JWT_SECRET = process.env.JWT_SECRET || 'sparorez-dev-secret-change-in-production';
const TOKEN_EXPIRY = '7d';

const app = express();
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// ── Auth helpers ──

function signToken(userId: string): string {
  return jwt.sign({ userId }, JWT_SECRET, { expiresIn: TOKEN_EXPIRY });
}

interface AuthRequest extends express.Request {
  userId?: string;
}

function authMiddleware(req: AuthRequest, res: express.Response, next: express.NextFunction) {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Token required' });
    return;
  }
  try {
    const payload = jwt.verify(header.slice(7), JWT_SECRET) as { userId: string };
    req.userId = payload.userId;
    next();
  } catch {
    res.status(401).json({ error: 'Invalid token' });
  }
}

// ── Auth routes ──

app.post('/api/auth/register', async (req, res) => {
  const { email, name, password } = req.body;
  if (!email || !name || !password) {
    res.status(400).json({ error: 'Email, name, and password are required' });
    return;
  }
  if (password.length < 6) {
    res.status(400).json({ error: 'Password must be at least 6 characters' });
    return;
  }
  const existing = await pool.query('SELECT id FROM users WHERE email = $1', [email.toLowerCase()]);
  if (existing.rows.length > 0) {
    res.status(409).json({ error: 'Email already registered' });
    return;
  }
  const hash = await bcrypt.hash(password, 10);
  const { rows } = await pool.query(
    'INSERT INTO users (email, name, password_hash) VALUES ($1, $2, $3) RETURNING id, email, name, is_admin',
    [email.toLowerCase(), name, hash],
  );
  const user = rows[0];
  const token = signToken(user.id);
  res.json({ user, token });
});

app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    res.status(400).json({ error: 'Email and password are required' });
    return;
  }
  const { rows } = await pool.query('SELECT id, email, name, password_hash, is_admin FROM users WHERE email = $1', [email.toLowerCase()]);
  if (rows.length === 0) {
    res.status(401).json({ error: 'Invalid email or password' });
    return;
  }
  const user = rows[0];
  const valid = await bcrypt.compare(password, user.password_hash);
  if (!valid) {
    res.status(401).json({ error: 'Invalid email or password' });
    return;
  }
  const token = signToken(user.id);
  res.json({ user: { id: user.id, email: user.email, name: user.name, is_admin: user.is_admin }, token });
});

app.post('/api/auth/forgot-password', async (req, res) => {
  const { email } = req.body;
  if (!email) { res.status(400).json({ error: 'Email is required' }); return; }
  const { rows } = await pool.query('SELECT id FROM users WHERE email = $1', [email.toLowerCase()]);
  // Always return success to avoid email enumeration
  if (rows.length === 0) { res.json({ ok: true }); return; }
  const token = crypto.randomBytes(32).toString('hex');
  const expires = new Date(Date.now() + 3600000); // 1 hour
  await pool.query('UPDATE users SET reset_token = $1, reset_token_expires = $2 WHERE id = $3', [token, expires, rows[0].id]);
  // In production, send email with reset link. For now, log it.
  console.log(`Password reset token for ${email}: ${token}`);
  res.json({ ok: true, resetToken: token }); // Remove resetToken from response in production
});

app.post('/api/auth/reset-password', async (req, res) => {
  const { token, password } = req.body;
  if (!token || !password) { res.status(400).json({ error: 'Token and password are required' }); return; }
  if (password.length < 6) { res.status(400).json({ error: 'Password must be at least 6 characters' }); return; }
  const { rows } = await pool.query(
    'SELECT id FROM users WHERE reset_token = $1 AND reset_token_expires > NOW()',
    [token],
  );
  if (rows.length === 0) { res.status(400).json({ error: 'Invalid or expired reset token' }); return; }
  const hash = await bcrypt.hash(password, 10);
  await pool.query(
    'UPDATE users SET password_hash = $1, reset_token = NULL, reset_token_expires = NULL WHERE id = $2',
    [hash, rows[0].id],
  );
  res.json({ ok: true });
});

app.get('/api/auth/me', authMiddleware, async (req: AuthRequest, res) => {
  const { rows } = await pool.query('SELECT id, email, name, is_admin FROM users WHERE id = $1', [req.userId]);
  if (rows.length === 0) { res.status(404).json({ error: 'User not found' }); return; }
  res.json(rows[0]);
});

// ── Projects (all require auth) ──

app.get('/api/projects', authMiddleware, async (req: AuthRequest, res) => {
  const { rows } = await pool.query(
    'SELECT id, name, created_at, updated_at FROM projects WHERE user_id = $1 ORDER BY created_at',
    [req.userId],
  );
  res.json(rows);
});

app.post('/api/projects', authMiddleware, async (req: AuthRequest, res) => {
  const { name } = req.body;
  if (!name) { res.status(400).json({ error: 'Name is required' }); return; }
  const { rows } = await pool.query(
    'INSERT INTO projects (user_id, name) VALUES ($1, $2) RETURNING id, name, created_at, updated_at',
    [req.userId, name],
  );
  res.json(rows[0]);
});

app.put('/api/projects/:id', authMiddleware, async (req: AuthRequest, res) => {
  const { name } = req.body;
  const { rows } = await pool.query(
    'UPDATE projects SET name = $1, updated_at = NOW() WHERE id = $2 AND user_id = $3 RETURNING id, name, created_at, updated_at',
    [name, req.params.id, req.userId],
  );
  if (rows.length === 0) { res.status(404).json({ error: 'Project not found' }); return; }
  res.json(rows[0]);
});

app.delete('/api/projects/:id', authMiddleware, async (req: AuthRequest, res) => {
  await pool.query('DELETE FROM projects WHERE id = $1 AND user_id = $2', [req.params.id, req.userId]);
  res.json({ ok: true });
});

// ── Rooms (under a project) ──

app.get('/api/projects/:projectId/rooms', authMiddleware, async (req: AuthRequest, res) => {
  // Verify ownership
  const proj = await pool.query('SELECT id FROM projects WHERE id = $1 AND user_id = $2', [req.params.projectId, req.userId]);
  if (proj.rows.length === 0) { res.status(404).json({ error: 'Project not found' }); return; }

  const { rows } = await pool.query(
    'SELECT data FROM rooms WHERE project_id = $1 ORDER BY sort_order',
    [req.params.projectId],
  );
  res.json(rows.map(r => r.data));
});

app.put('/api/projects/:projectId/rooms', authMiddleware, async (req: AuthRequest, res) => {
  const proj = await pool.query('SELECT id FROM projects WHERE id = $1 AND user_id = $2', [req.params.projectId, req.userId]);
  if (proj.rows.length === 0) { res.status(404).json({ error: 'Project not found' }); return; }

  const rooms: { id: string }[] = req.body;
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query('DELETE FROM rooms WHERE project_id = $1', [req.params.projectId]);
    for (let i = 0; i < rooms.length; i++) {
      await client.query(
        'INSERT INTO rooms (id, project_id, data, sort_order, updated_at) VALUES ($1, $2, $3, $4, NOW())',
        [rooms[i].id, req.params.projectId, JSON.stringify(rooms[i]), i],
      );
    }
    await client.query('COMMIT');
    await pool.query('UPDATE projects SET updated_at = NOW() WHERE id = $1', [req.params.projectId]);
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
  }
  res.json({ ok: true });
});

// ── Purchased tiles (under a project) ──

app.get('/api/projects/:projectId/purchased', authMiddleware, async (req: AuthRequest, res) => {
  const proj = await pool.query('SELECT id FROM projects WHERE id = $1 AND user_id = $2', [req.params.projectId, req.userId]);
  if (proj.rows.length === 0) { res.status(404).json({ error: 'Project not found' }); return; }

  const { rows } = await pool.query(
    'SELECT tile_name, quantity FROM purchased_tiles WHERE project_id = $1',
    [req.params.projectId],
  );
  const map: Record<string, number> = {};
  for (const r of rows) map[r.tile_name] = r.quantity;
  res.json(map);
});

app.put('/api/projects/:projectId/purchased', authMiddleware, async (req: AuthRequest, res) => {
  const proj = await pool.query('SELECT id FROM projects WHERE id = $1 AND user_id = $2', [req.params.projectId, req.userId]);
  if (proj.rows.length === 0) { res.status(404).json({ error: 'Project not found' }); return; }

  const tiles: Record<string, number> = req.body;
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query('DELETE FROM purchased_tiles WHERE project_id = $1', [req.params.projectId]);
    for (const [name, qty] of Object.entries(tiles)) {
      if (qty > 0) {
        await client.query(
          'INSERT INTO purchased_tiles (project_id, tile_name, quantity) VALUES ($1, $2, $3)',
          [req.params.projectId, name, qty],
        );
      }
    }
    await client.query('COMMIT');
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
  }
  res.json({ ok: true });
});

// ── Admin middleware ──

async function adminMiddleware(req: AuthRequest, res: express.Response, next: express.NextFunction) {
  const { rows } = await pool.query('SELECT is_admin FROM users WHERE id = $1', [req.userId]);
  if (rows.length === 0 || !rows[0].is_admin) {
    res.status(403).json({ error: 'Admin access required' });
    return;
  }
  next();
}

// ── Admin routes ──

app.get('/api/admin/stats', authMiddleware, adminMiddleware, async (_req: AuthRequest, res) => {
  const [usersRes, projectsRes, roomsRes, recentRes] = await Promise.all([
    pool.query('SELECT COUNT(*)::int AS count FROM users'),
    pool.query('SELECT COUNT(*)::int AS count FROM projects'),
    pool.query('SELECT COUNT(*)::int AS count FROM rooms'),
    pool.query(`
      SELECT DATE(created_at)::text AS date, COUNT(*)::int AS count
      FROM users
      WHERE created_at > NOW() - INTERVAL '30 days'
      GROUP BY DATE(created_at)
      ORDER BY date
    `),
  ]);
  res.json({
    totalUsers: usersRes.rows[0].count,
    totalProjects: projectsRes.rows[0].count,
    totalRooms: roomsRes.rows[0].count,
    recentUsers: recentRes.rows,
  });
});

app.get('/api/admin/users', authMiddleware, adminMiddleware, async (_req: AuthRequest, res) => {
  const { rows } = await pool.query(`
    SELECT u.id, u.email, u.name, u.is_admin, u.created_at,
      (SELECT COUNT(*)::int FROM projects p WHERE p.user_id = u.id) AS project_count
    FROM users u
    ORDER BY u.created_at DESC
  `);
  res.json(rows);
});

app.delete('/api/admin/users/:id', authMiddleware, adminMiddleware, async (req: AuthRequest, res) => {
  if (req.params.id === req.userId) {
    res.status(400).json({ error: 'Cannot delete yourself' });
    return;
  }
  await pool.query('DELETE FROM users WHERE id = $1', [req.params.id]);
  res.json({ ok: true });
});

app.put('/api/admin/users/:id/admin', authMiddleware, adminMiddleware, async (req: AuthRequest, res) => {
  if (req.params.id === req.userId) {
    res.status(400).json({ error: 'Cannot change your own admin status' });
    return;
  }
  const { is_admin } = req.body;
  await pool.query('UPDATE users SET is_admin = $1 WHERE id = $2', [!!is_admin, req.params.id]);
  res.json({ ok: true });
});

// ── Serve static in production ──
if (process.env.NODE_ENV === 'production') {
  const path = await import('path');
  const distPath = path.resolve(import.meta.dirname, '../dist');
  app.use(express.static(distPath));
  app.get('{*path}', (_req, res) => {
    res.sendFile(path.resolve(distPath, 'index.html'));
  });
}

const PORT = parseInt(process.env.PORT || '3001');
app.listen(PORT, () => {
  console.log(`API server running on http://localhost:${PORT}`);
});
