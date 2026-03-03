import express from 'express';
import cors from 'cors';
import { migrate, initDb } from './db.js';
import agentsRouter from './routes/agents.js';
import servicesRouter from './routes/services.js';
import offersRouter from './routes/offers.js';
import escrowsRouter from './routes/escrows.js';
import deliveriesRouter from './routes/deliveries.js';
import eventsRouter from './routes/events.js';
import reputationRouter from './routes/reputation.js';

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Routes
app.use('/agents', agentsRouter);
app.use('/services', servicesRouter);
app.use('/offers', offersRouter);
app.use('/escrows', escrowsRouter);
app.use('/escrows', deliveriesRouter);
app.use('/events', eventsRouter);
app.use('/reputation', reputationRouter);

// Start server
async function start() {
  try {
    // Initialize DB and run migrations
    await initDb();
    migrate();
    
    app.listen(PORT, () => {
      console.log(`🌍 Globe API running on http://localhost:${PORT}`);
    });
  } catch (e) {
    console.error('Failed to start:', e);
    process.exit(1);
  }
}

start();

export default app;
