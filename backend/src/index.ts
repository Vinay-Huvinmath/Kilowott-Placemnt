import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { authRouter } from './routes/auth.routes.js';
import { dashboardRouter } from './routes/dashboard.routes.js';
import { customersRouter } from './routes/customers.routes.js';
import { ordersRouter } from './routes/orders.routes.js';
import { communicationsRouter } from './routes/communications.routes.js';
import { workflowsRouter } from './routes/workflows.routes.js';
import { syncRouter } from './routes/sync.routes.js';
import { runInitialSeed } from './seed.js';
import { startWorkflowEngine } from './workflows/workflow.service.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// Routes
app.use('/api/auth', authRouter);
app.use('/api/dashboard', dashboardRouter);
app.use('/api/customers', customersRouter);
app.use('/api/orders', ordersRouter);
app.use('/api/communications', communicationsRouter);
app.use('/api/workflows', workflowsRouter);
app.use('/api/sync', syncRouter);

// Direct top-level webhooks & demo endpoints per specification
app.use('/api', syncRouter);

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', service: 'Pulse CRM API' });
});

app.listen(PORT, async () => {
  console.log(`Pulse CRM backend listening on port ${PORT}`);
  try {
    await runInitialSeed(false);
    startWorkflowEngine();
    console.log('Database synced and workflow engine active.');
  } catch (err: any) {
    console.error('Startup initialization error:', err.message);
  }
});
