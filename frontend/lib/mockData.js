export const mockUser = {
  id: 1,
  name: "Shravan",
  email: "shravan@example.com",
  role: "student",
};

export const mockLectures = [
  {
    id: "1",
    title: "Introduction to AI",
    status: "done",
  },
  {
    id: "2",
    title: "Neural Networks",
    status: "processing",
  },
];

export const mockQuiz = [
  {
    question: "What is AI?",
    options: ["Machine", "Intelligence", "Artificial Intelligence", "None"],
    correctAnswer: 2,
  },
  {
    question: "Which is ML library?",
    options: ["React", "TensorFlow", "HTML", "CSS"],
    correctAnswer: 1,
  },
];

export const mockAnalytics = {
  scores: [70, 80, 90],
  topics: ["AI", "ML", "DL"],
};