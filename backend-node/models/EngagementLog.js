import mongoose from 'mongoose';

const engagementLogSchema = new mongoose.Schema({
  studentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  lectureId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Lecture',
    required: true,
  },
  score: {
    type: Number,
    required: true,
    min: 0,
    max: 1,
  },
  timestamp: {
    type: Date,
    default: Date.now,
  },
});

const EngagementLog = mongoose.model('EngagementLog', engagementLogSchema);

export default EngagementLog;