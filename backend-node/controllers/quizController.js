import mongoose from 'mongoose';
import Quiz from '../models/Quiz.js';
import QuizResult from '../models/QuizResult.js';

const validObjectId = (value) => mongoose.Types.ObjectId.isValid(value);

const publicQuestion = (question) => ({
  id: question._id.toString(),
  question: question.question,
  options: question.options,
  timestamp: question.timestamp ?? null,
  explanation: question.explanation || '',
});

export const getQuiz = async (req, res) => {
  try {
    const { lectureId } = req.params;

    if (!validObjectId(lectureId)) {
      return res.status(400).json({ error: 'Invalid lecture ID' });
    }

    const quiz = await Quiz.findOne({ lectureId });
    if (!quiz || !quiz.questions.length) {
      return res.status(404).json({ error: 'Quiz not found or not ready for this lecture' });
    }

    return res.status(200).json({
      quizId: quiz._id.toString(),
      lectureId: quiz.lectureId.toString(),
      questions: quiz.questions.map(publicQuestion),
    });
  } catch (error) {
    console.error('[quiz:getQuiz]', error);
    return res.status(500).json({ error: 'Unable to load quiz' });
  }
};

export const checkAnswer = async (req, res) => {
  try {
    const { lectureId, questionId, answerIndex } = req.body;
    const selectedIndex = Number(answerIndex);

    if (
      !validObjectId(lectureId) ||
      !validObjectId(questionId) ||
      !Number.isInteger(selectedIndex) ||
      selectedIndex < 0 ||
      selectedIndex > 3
    ) {
      return res.status(400).json({
        error: 'Valid lectureId, questionId and answerIndex (0-3) are required',
      });
    }

    const quiz = await Quiz.findOne({ lectureId });
    if (!quiz) {
      return res.status(404).json({ error: 'Quiz not found for this lecture' });
    }

    const question = quiz.questions.id(questionId);
    if (!question) {
      return res.status(404).json({ error: 'Question not found in this quiz' });
    }

    const isCorrect = question.correctIndex === selectedIndex;

    return res.status(200).json({
      isCorrect,
      correctIndex: question.correctIndex,
      explanation: question.explanation || (
        isCorrect
          ? 'Correct. You understood this concept.'
          : 'Incorrect. Review this part of the lecture.'
      ),
    });
  } catch (error) {
    console.error('[quiz:checkAnswer]', error);
    return res.status(500).json({ error: 'Unable to check answer' });
  }
};

export const submitQuiz = async (req, res) => {
  try {
    const { quizId, lectureId, answers } = req.body;

    if (
      !validObjectId(quizId) ||
      !validObjectId(lectureId) ||
      !Array.isArray(answers)
    ) {
      return res.status(400).json({
        error: 'Valid quizId, lectureId and answers array are required',
      });
    }

    const quiz = await Quiz.findById(quizId);
    if (!quiz || quiz.lectureId.toString() !== lectureId.toString()) {
      return res.status(404).json({ error: 'Quiz not found for this lecture' });
    }

    if (!quiz.questions.length) {
      return res.status(400).json({ error: 'This quiz has no questions' });
    }

    if (
      answers.length !== quiz.questions.length ||
      answers.some((answer) =>
        !Number.isInteger(Number(answer)) ||
        Number(answer) < 0 ||
        Number(answer) > 3
      )
    ) {
      return res.status(400).json({
        error: 'Submit exactly one valid answer index (0-3) for every question',
      });
    }

    const normalizedAnswers = answers.map(Number);
    let correct = 0;

    const correctAnswers = quiz.questions.map((question, index) => {
      if (normalizedAnswers[index] === question.correctIndex) correct += 1;
      return question.correctIndex;
    });

    const total = quiz.questions.length;
    const score = Math.round((correct / total) * 100);

    await QuizResult.create({
      studentId: req.user._id,
      lectureId: quiz.lectureId,
      quizId: quiz._id,
      score,
      answers: normalizedAnswers,
    });

    return res.status(200).json({
      score,
      correct,
      total,
      correctAnswers,
    });
  } catch (error) {
    console.error('[quiz:submitQuiz]', error);
    return res.status(500).json({ error: 'Unable to submit quiz' });
  }
};
