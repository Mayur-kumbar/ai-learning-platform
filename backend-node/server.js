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
import Course from './models/Course.js';
import Lecture from './models/Lecture.js';
import { protect } from './middlewares/authMiddleware.js';
import { accessibleCourses, requireLectureAccess } from './middlewares/courseAccess.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

app.use(cors({
  origin: ['http://localhost:3000', 'http://localhost:3001', 'http://localhost:5173', 'http://127.0.0.1:3001']
}));
app.use('/api/lectures/:id/callback', express.json({limit: '4mb'}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
// Protected media is served through the lecture router.

app.use('/api/courses', courseRoutes)
app.post('/api/ai/ask', protect, requireLectureAccess, async (req, res) => {
  const question = req.body.question;
  if (typeof question !== 'string' || !question.trim() || question.length > 1000) return res.status(400).json({error: 'Enter a question up to 1000 characters.'});
  const lecture = await Lecture.findById(req.body.lectureId).select('transcript title');
  const ignored = new Set('what where when which who how why does did are the this that with from lecture tell explain about please and for'.split(' '));
  const words = text => (text.toLowerCase().match(/[\p{L}\p{N}]+/gu) || []).filter(w => w.length > 2 && !ignored.has(w));
  const terms = new Set(words(question));
  const passages = (lecture?.transcript || '').match(/[^.!?\n]+[.!?]?/g) || [];
  const best = passages.map((text,index) => ({text: text.trim(), index, hits: new Set(words(text).filter(word => terms.has(word))).size}))
    .sort((a,b) => b.hits - a.hits)[0];
  if (!terms.size || !best || best.hits < Math.ceil(terms.size / 2)) return res.json({answer:'No matching passage found in this lecture.', sources:[]});
  res.json({answer:best.text, sources:[{title:lecture.title + ' · passage ' + (best.index + 1)}]});
});
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

        if (conn.role !== 'student' || !await Course.exists({lectures: lectureId, ...accessibleCourses({_id: conn.userId, role: conn.role})})) return;
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
          const owner = await Course.findOne({lectures: lectureId, students: conn.userId}).select('instructorId');
          for (const [client, clientConn] of connections.entries()) {
            if (
              clientConn.role === 'instructor' && String(owner?.instructorId) === clientConn.userId &&
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
const PORT = process.env.PORT || 4000;

httpServer.listen(PORT, process.env.HOST || undefined, async () => {
  await connectDB();
  console.log(`HTTP server running on port ${PORT}`);
  console.log(`WebSocket server running on ws://localhost:${PORT}`);
});

export { httpServer };
