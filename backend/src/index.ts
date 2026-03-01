import 'express-async-errors';
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

dotenv.config();

import { errorHandler } from './middleware/errorHandler';
import dashboardRouter from './routes/basketball-dashboard';
import playersRouter from './routes/players';
import drillsRouter from './routes/drills';
import sessionsRouter from './routes/sessions';

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
app.use('/api/players', playersRouter);
app.use('/api/drills', drillsRouter);
app.use('/api/sessions', sessionsRouter);

app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`Hoops Training API running on port ${PORT}`);
});

export default app;
