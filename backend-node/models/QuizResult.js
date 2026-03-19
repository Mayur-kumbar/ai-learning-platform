import mongoose from 'mongoose';

const quizResultSchema = new mongoose.Schema({
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
  quizId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Quiz',
    required: true,
  },
  score: {
    type: Number,
    required: true,
    min: 0,
    max: 100,
  },
  answers: {
    type: [Number],
    default: [],
  },
  submittedAt: {
    type: Date,
    default: Date.now,
  },
});

const QuizResult = mongoose.model('QuizResult', quizResultSchema);

export default QuizResult;