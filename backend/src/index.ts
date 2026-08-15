import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { env } from './config/env';
import { notFound, errorHandler } from './middleware/error';

import authRoutes from './routes/auth.routes';
import gmailRoutes from './routes/gmail.routes';
import expenseRoutes from './routes/expenses.routes';
import workoutRoutes from './routes/workouts.routes';
import reminderRoutes from './routes/reminders.routes';
import preReadRoutes from './routes/prereads.routes';

const app = express();

app.use(helmet());
app.use(cors()); // open CORS for the mobile app; tighten with an allowlist in prod
app.use(express.json({ limit: '1mb' }));
app.use(morgan(env.isProd ? 'combined' : 'dev'));

app.get('/health', (_req, res) => res.json({ status: 'ok', ts: Date.now() }));

app.use('/api/auth', authRoutes);
app.use('/api/gmail', gmailRoutes);
app.use('/api/expenses', expenseRoutes);
app.use('/api/workouts', workoutRoutes);
app.use('/api/reminders', reminderRoutes);
app.use('/api/prereads', preReadRoutes);

app.use(notFound);
app.use(errorHandler);

app.listen(env.port, () => {
  console.log(`🚀 Campus Companion API on http://localhost:${env.port}`);
  console.log(`   Gmail keywords: ${env.gmailKeywords.join(', ')}`);
});
