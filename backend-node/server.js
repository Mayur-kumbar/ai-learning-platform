import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer } from 'http';
import { WebSocketServer } from 'ws';
import { connectDB } from './config/db.js';
import authRoutes from './routes/auth.js';
import lectureRoutes from './routes/lectures.js';
import quizRoutes from './routes/quiz.js';
import analyticsRoutes from './routes/analytics.js';
import EngagementLog from './models/EngagementLog.js';
import courseRoutes from './routes/course.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

app.use(cors({
  origin: ['http://localhost:3000', 'http://localhost:3001', 'http://localhost:5173']
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

app.use('/api/courses', courseRoutes)
app.use('/api/auth', authRoutes);
app.use('/api/lectures', lectureRoutes);
app.use('/api/quiz', quizRoutes);
app.use('/api/analytics', analyticsRoutes);

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.status || 500).json({ error: err.message || 'Internal server error' });
});

// ── WebSocket server ────────────────────────────────────────────────────────
const httpServer = createServer(app);
const wss = new WebSocketServer({ server: httpServer });

// track connections — { ws, userId, role }
const connections = new Map();

// track recent engagement scores per student per lecture
// { `${studentId}_${lectureId}`: [score1, score2, score3] }
const recentScores = new Map();

wss.on('connection', (ws) => {
  console.log('[ws] new connection');

  ws.on('message', async (raw) => {
    try {
      const msg = JSON.parse(raw);

      // ── auth message ──────────────────────────────────────────────────────
      if (msg.type === 'auth') {
        const { default: jwt } = await import('jsonwebtoken');
        try {
          const decoded = jwt.verify(msg.token, process.env.JWT_SECRET);
          connections.set(ws, {
            userId: decoded.id,
            role: decoded.role,
          });
          ws.send(JSON.stringify({ type: 'auth', status: 'ok' }));
          console.log(`[ws] authenticated user ${decoded.id}`);
        } catch {
          ws.send(JSON.stringify({ type: 'auth', status: 'invalid_token' }));
          ws.close();
        }
        return;
      }

      // ── engagement message ────────────────────────────────────────────────
      if (msg.type === 'engagement') {
        const conn = connections.get(ws);
        if (!conn) {
          ws.send(JSON.stringify({ type: 'error', message: 'Not authenticated' }));
          return;
        }

        const { lectureId, score, timestamp } = msg;

        // save to database
        await EngagementLog.create({
          studentId: conn.userId,
          lectureId,
          score,
          timestamp: timestamp ? new Date(timestamp) : new Date(),
        });

        // track last 3 scores for this student+lecture
        const key = `${conn.userId}_${lectureId}`;
        const scores = recentScores.get(key) || [];
        scores.push(score);
        if (scores.length > 3) scores.shift();
        recentScores.set(key, scores);

        // alert instructors if last 3 scores all below 0.4
        if (scores.length === 3 && scores.every((s) => s < 0.4)) {
          for (const [client, clientConn] of connections.entries()) {
            if (
              clientConn.role === 'instructor' &&
              client.readyState === ws.OPEN
            ) {
              client.send(JSON.stringify({
                type: 'low_engagement_alert',
                studentId: conn.userId,
                lectureId,
                averageScore: parseFloat(
                  (scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(2)
                ),
              }));
            }
          }
        }
      }
    } catch (error) {
      console.error('[ws] message error:', error.message);
    }
  });

  ws.on('close', () => {
    connections.delete(ws);
    console.log('[ws] connection closed');
  });

  ws.on('error', (error) => {
    console.error('[ws] error:', error.message);
    connections.delete(ws);
  });
});

// ── start server ────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 3000;

httpServer.listen(PORT, async () => {
  await connectDB();
  console.log(`HTTP server running on port ${PORT}`);
  console.log(`WebSocket server running on ws://localhost:${PORT}`);
});

export { httpServer };
