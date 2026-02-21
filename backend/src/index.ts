import 'express-async-errors';
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

dotenv.config();

import { errorHandler } from './middleware/errorHandler';
import projectsRouter from './routes/projects';
import clientsRouter from './routes/clients';
import teamRouter from './routes/team';
import financialsRouter from './routes/financials';
import reportsRouter from './routes/reports';
import pipelineRouter from './routes/pipeline';
import harvestRouter from './routes/harvest';
import utilizationRouter from './routes/utilization';
import dashboardRouter from './routes/dashboard';

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors({ origin: ['http://localhost:5173', 'http://localhost:3000'] }));
app.use(express.json());

// Health check
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// API routes
app.use('/api/dashboard', dashboardRouter);
app.use('/api/projects', projectsRouter);
app.use('/api/clients', clientsRouter);
app.use('/api/team', teamRouter);
app.use('/api/financials', financialsRouter);
app.use('/api/reports', reportsRouter);
app.use('/api/pipeline', pipelineRouter);
app.use('/api/harvest', harvestRouter);
app.use('/api/utilization', utilizationRouter);

app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`Paradise PM API running on port ${PORT}`);
});

export default app;
