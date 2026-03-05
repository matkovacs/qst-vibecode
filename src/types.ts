export type QuestionType = "text" | "multiple-choice" | "single-select";

export interface Question {
  id: string;
  text: string;
  type: QuestionType;
  options?: string[];
  required: boolean;
  rules?: QuestionRule[];
}

export type ConditionOperator = "Equals" | "Contains" | "OneOf" | "NotOneOf";

export interface QuestionRule {
  operator: ConditionOperator;
  value: string;
  action: "show" | "hide";
  targetId: string;
}

export interface Questionnaire {
  id: string;
  title: string;
  description?: string;
  questions: Question[];
  createdAt: string;
}

export type AnswerValue = string | string[];

export interface Answer {
  questionId: string;
  value: AnswerValue;
}

export interface Response {
  id: string;
  questionnaireId: string;
  answers: Answer[];
  submittedAt: string;
}
