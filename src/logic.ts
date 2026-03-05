import type { Question, QuestionRule, AnswerValue } from "./types.js";

function evaluateCondition(
  answer: AnswerValue | undefined,
  rule: QuestionRule,
): boolean {
  if (
    answer === undefined ||
    answer === "" ||
    (Array.isArray(answer) && answer.length === 0)
  ) {
    return false;
  }
  const parts = Array.isArray(answer) ? answer : [String(answer)];
  switch (rule.operator) {
    case "Equals":
      return parts.length === 1 && parts[0] === rule.value;
    case "Contains":
      return (
        typeof parts[0] === "string" &&
        parts[0].toLowerCase().includes(rule.value.toLowerCase())
      );
    case "OneOf":
      return parts.some((a) => a === rule.value);
    case "NotOneOf":
      return !parts.some((a) => a === rule.value);
  }
}

/**
 * Evaluates which questions should be visible.
 * Logic is stored on source questions and controls visibility of target questions.
 * - action="hide": target is hidden when condition is met
 * - action="show": target is hidden when condition is NOT met
 */
export function evaluateVisibility(
  questions: Question[],
  answers: Record<string, AnswerValue>,
): Record<string, boolean> {
  const visibility: Record<string, boolean> = {};
  for (const q of questions) {
    visibility[q.id] = true;
  }

  for (const q of questions) {
    if (!q.rules?.length) continue;
    for (const rule of q.rules) {
      if (!rule.targetId) continue;
      const condMet = evaluateCondition(answers[q.id], rule);
      const shouldHide = rule.action === "hide" ? condMet : !condMet;
      if (shouldHide) {
        visibility[rule.targetId] = false;
      }
    }
  }

  return visibility;
}

/**
 * Remove rules whose targetId references a question that no longer exists.
 * Call after deleteQuestion in BuilderPage.
 */
export function cleanOrphanedRules(questions: Question[]): Question[] {
  const ids = new Set(questions.map((q) => q.id));
  return questions.map((q) => {
    if (!q.rules?.length) return q;
    const rules = q.rules.filter((r) => ids.has(r.targetId));
    return { ...q, rules: rules.length ? rules : undefined };
  });
}
