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
  outcomes: { type: [{ topic: String, correct: Boolean, question: String, explanation: String }], default: undefined },
  attemptKey: {type: String},
  submittedAt: {
    type: Date,
    default: Date.now,
  },
});

quizResultSchema.index({studentId:1, quizId:1, attemptKey:1}, {unique:true, partialFilterExpression:{attemptKey:{$type:"string"}}});

const QuizResult = mongoose.model('QuizResult', quizResultSchema);

export default QuizResult;