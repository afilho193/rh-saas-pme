import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import multer from 'multer';
import routes from './routes/index.js';

dotenv.config();

const app = express();

app.use(express.json());
app.use(cors());

app.use('/api', routes);

app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Multer throws (file too large, rejected mime type) instead of calling next() with a
// plain error in a way Express's default handler renders as JSON, so it needs its own
// handler here — otherwise a bad upload returns an HTML error page instead of { error }.
app.use((err, req, res, next) => {
  if (err instanceof multer.MulterError || err?.message?.includes('Unsupported file type')) {
    return res.status(400).json({ error: err.message });
  }
  next(err);
});

export default app;
