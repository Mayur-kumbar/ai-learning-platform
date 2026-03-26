import Quiz from '../models/Quiz.js';
import QuizResult from '../models/QuizResult.js';

export const getQuiz = async (req, res) => {
  try {
    const quiz = await Quiz.findOne({ lectureId: req.params.lectureId });

    if (!quiz) {
      return res.status(404).json({ error: 'Quiz not found for this lecture' });
    }

    // strip correctIndex before sending to student
    const questions = quiz.questions.map(({ question, options }) => ({
      question,
      options,
    }));

    return res.status(200).json({
      quizId: quiz._id,
      lectureId: quiz.lectureId,
      questions,
    });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

export const submitQuiz = async (req, res) => {
  try {
    const { quizId, lectureId, answers } = req.body;

    if (!quizId || !lectureId || !answers) {
      return res.status(400).json({ error: 'quizId, lectureId and answers are required' });
    }

    const quiz = await Quiz.findById(quizId);
    if (!quiz) {
      return res.status(404).json({ error: 'Quiz not found' });
    }

    // calculate score
    let correct = 0;
    const correctAnswers = quiz.questions.map((q, i) => {
      const isCorrect = answers[i] === q.correctIndex;
      if (isCorrect) correct++;
      return q.correctIndex;
    });

    const score = Math.round((correct / quiz.questions.length) * 100);

    await QuizResult.create({
      studentId: req.user._id,
      lectureId,
      quizId,
      score,
      answers,
    });

    return res.status(200).json({
      score,
      correct,
      total: quiz.questions.length,
      correctAnswers,
    });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};