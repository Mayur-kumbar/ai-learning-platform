import mongoose from 'mongoose';

const timelineEntrySchema = new mongoose.Schema({
  lectureSecond: { type: Number, required: true },
  score: { type: Number, min: 0, max: 1, default: null },
  confidence: { type: Number, min: 0, max: 1 },
  gazeScore: { type: Number, min: 0, max: 1 },
  headPoseScore: { type: Number, min: 0, max: 1 },
  presence: { type: Boolean, default: true },
  tabVisible: { type: Boolean },
  trackingMode: { type: String, enum: ['camera', 'behavioral'] },
  playbackActive: { type: Boolean },
  watchedDurationSec: { type: Number, min: 0 },
  isDrowsy: { type: Boolean, default: false },
}, { _id: false });

const engagementLogSchema = new mongoose.Schema({
  studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  lectureId: { type: mongoose.Schema.Types.ObjectId, ref: 'Lecture', required: true, index: true },
  sessionId: { type: String, index: true },
  batchId: { type: String },
  // legacy single-score (kept for WS path)
  score: { type: Number, min: 0, max: 1 },
  // session summary fields (from batch HTTP path)
  averageScore: { type: Number, min: 0, max: 1 },
  presenceRatio: { type: Number, min: 0, max: 1 },
  tabFocusRatio: { type: Number, min: 0, max: 1 },
  disengagedDurationSec: { type: Number, default: 0 },
  sessionDurationSec: { type: Number },
  watchedDurationSec: { type: Number, min: 0 },
  observationCoverage: { type: Number, min: 0, max: 1 },
  averageConfidence: { type: Number, min: 0, max: 1 },
  trackingMode: { type: String, enum: ['camera', 'behavioral', 'mixed'] },
  // per-interval timeline for heatmap (capped at 200 entries, TTL via app logic)
  timeline: { type: [timelineEntrySchema], default: undefined },
  timestamp: { type: Date, default: Date.now },
}, { timestamps: true });

engagementLogSchema.index({ studentId: 1, lectureId: 1, createdAt: -1 });
engagementLogSchema.index({ studentId: 1, sessionId: 1, batchId: 1 }, { unique: true, sparse: true });

const EngagementLog = mongoose.model('EngagementLog', engagementLogSchema);
export default EngagementLog;
