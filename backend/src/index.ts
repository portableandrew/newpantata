import 'express-async-errors';
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

dotenv.config();

import { errorHandler } from './middleware/errorHandler';
import { requireAuth } from './middleware/auth';
import authRouter from './routes/auth';
import projectsRouter from './routes/projects';
import projectMembersRouter from './routes/projectMembers';
import clientsRouter from './routes/clients';
import teamRouter from './routes/team';
import financialsRouter from './routes/financials';
import reportsRouter from './routes/reports';
import pipelineRouter from './routes/pipeline';
import harvestRouter from './routes/harvest';
import utilizationRouter from './routes/utilization';
import dashboardRouter from './routes/dashboard';
import timeEntriesRouter from './routes/timeEntries';

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors({ origin: ['http://localhost:5173', 'http://localhost:5174', 'http://localhost:3000'] }));
app.use(express.json());

// Health check (public)
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Auth routes (public login, protected user management)
app.use('/api/auth', authRouter);

// All other API routes require auth
app.use('/api/dashboard', requireAuth, dashboardRouter);
app.use('/api/projects', requireAuth, projectsRouter);
app.use('/api/projects', requireAuth, projectMembersRouter);
app.use('/api/clients', requireAuth, clientsRouter);
app.use('/api/team', requireAuth, teamRouter);
app.use('/api/financials', requireAuth, financialsRouter);
app.use('/api/reports', requireAuth, reportsRouter);
app.use('/api/pipeline', requireAuth, pipelineRouter);
app.use('/api/harvest', requireAuth, harvestRouter);
app.use('/api/utilization', requireAuth, utilizationRouter);
app.use('/api/time-entries', requireAuth, timeEntriesRouter);

app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`Paradise PM API running on port ${PORT}`);
});

export default app;
