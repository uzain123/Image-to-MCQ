export interface GeneratedQuestion {
  text: string;
  type: "MULTIPLE_CHOICE" | "TRUE_FALSE" | "SHORT_ANSWER" | "LONG_ANSWER";
  options?: string[];
  correctAnswer?: number;
  maxMarks?: number;
  image?: string;
}

export interface QuizConfig {
  questionCount: number;
  questionType: "MULTIPLE_CHOICE" | "TRUE_FALSE" | "SHORT_ANSWER" | "LONG_ANSWER" | "MIXED";
  educationLevel: "GCSE" | "A-LEVEL";
  quizType: "retrieval" | "mini" | "assignment" | "application" | "marks-per-point" | "specific";
}

export interface GenerateQuestionsRequest {
  imageBase64: string | string[];
  config: QuizConfig;
  customPrompt?: string;
}