import type { Questionnaire, Response } from "./types.js";

const QUESTIONNAIRES_KEY = "questionnaires";
const RESPONSES_KEY = "responses";

export function getQuestionnaires(): Questionnaire[] {
  try {
    return JSON.parse(localStorage.getItem(QUESTIONNAIRES_KEY) ?? "[]");
  } catch {
    return [];
  }
}

export function getQuestionnaire(id: string): Questionnaire | undefined {
  return getQuestionnaires().find((q) => q.id === id);
}

export function saveQuestionnaire(q: Questionnaire): void {
  const all = getQuestionnaires();
  const idx = all.findIndex((x) => x.id === q.id);
  if (idx >= 0) all[idx] = q;
  else all.push(q);
  localStorage.setItem(QUESTIONNAIRES_KEY, JSON.stringify(all));
}

export function deleteQuestionnaire(id: string): void {
  const questionnaires = getQuestionnaires().filter((q) => q.id !== id);
  localStorage.setItem(QUESTIONNAIRES_KEY, JSON.stringify(questionnaires));
  const responses = getAllResponses().filter((r) => r.questionnaireId !== id);
  localStorage.setItem(RESPONSES_KEY, JSON.stringify(responses));
}

function getAllResponses(): Response[] {
  try {
    return JSON.parse(localStorage.getItem(RESPONSES_KEY) ?? "[]");
  } catch {
    return [];
  }
}

export function getResponses(questionnaireId: string): Response[] {
  return getAllResponses().filter((r) => r.questionnaireId === questionnaireId);
}

export function saveResponse(r: Response): void {
  const all = getAllResponses();
  all.push(r);
  localStorage.setItem(RESPONSES_KEY, JSON.stringify(all));
}
