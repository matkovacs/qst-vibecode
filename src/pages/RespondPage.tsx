import { useState, useMemo } from "react";
import { useNavigate, useParams, NavLink } from "react-router";
import { PageHeader, OverflowBreadcrumbs } from "@diligentcorp/atlas-react-bundle";
import { Alert, Button, Card, CardContent, Stack, Typography } from "@mui/material";

import PageLayout from "../components/PageLayout.js";
import QuestionInput from "../components/QuestionInput.js";
import { getQuestionnaire, saveResponse } from "../storage.js";
import { evaluateVisibility } from "../logic.js";
import type { Answer, AnswerValue, Response } from "../types.js";

export default function RespondPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const questionnaire = id ? getQuestionnaire(id) : undefined;

  const [answers, setAnswers] = useState<Record<string, AnswerValue>>({});
  const [error, setError] = useState<string | null>(null);

  const visibility = useMemo(
    () => evaluateVisibility(questionnaire?.questions ?? [], answers),
    [questionnaire?.questions, answers],
  );

  if (!questionnaire) {
    return (
      <PageLayout>
        <Typography>Questionnaire not found.</Typography>
      </PageLayout>
    );
  }

  function setAnswer(questionId: string, value: AnswerValue) {
    setAnswers((prev) => ({ ...prev, [questionId]: value }));
  }

  function handleSubmit() {
    for (const q of questionnaire!.questions) {
      if (q.required && visibility[q.id] !== false) {
        const val = answers[q.id];
        if (!val || (Array.isArray(val) && val.length === 0) || val === "") {
          setError(`Please answer the required question: "${q.text}"`);
          return;
        }
      }
    }
    setError(null);

    const response: Response = {
      id: crypto.randomUUID(),
      questionnaireId: questionnaire!.id,
      answers: questionnaire!.questions
        .filter((q) => visibility[q.id] !== false)
        .map((q): Answer => ({
          questionId: q.id,
          value: answers[q.id] ?? (q.type === "multiple-choice" ? [] : ""),
        })),
      submittedAt: new Date().toISOString(),
    };
    saveResponse(response);
    navigate(`/results/${questionnaire!.id}`);
  }

  return (
    <PageLayout>
      <PageHeader
        pageTitle={questionnaire.title}
        pageSubtitle={questionnaire.description}
        breadcrumbs={
          <OverflowBreadcrumbs
            leadingElement={<span>Questionnaire App</span>}
            items={[
              { id: "home", label: "Questionnaires", url: "/" },
              { id: "respond", label: questionnaire.title, url: `/respond/${id}` },
            ]}
            hideLastItem={true}
            aria-label="Breadcrumbs"
          >
            {({ label, url }) => <NavLink to={url}>{label}</NavLink>}
          </OverflowBreadcrumbs>
        }
      />

      {error && (
        <Alert severity="error" onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      <Stack gap={3}>
        {questionnaire.questions
          .filter((q) => visibility[q.id] !== false)
          .map((q, i) => (
            <Card key={q.id} variant="outlined">
              <CardContent>
                <Typography variant="subtitle2" color="text.secondary" mb={0.5}>
                  Question {i + 1}
                  {q.required ? " *" : ""}
                </Typography>
                <QuestionInput
                  question={q}
                  value={answers[q.id] ?? (q.type === "multiple-choice" ? [] : "")}
                  onChange={(val) => setAnswer(q.id, val)}
                />
              </CardContent>
            </Card>
          ))}
      </Stack>

      <Stack direction="row" gap={2} justifyContent="flex-end" pb={4}>
        <Button variant="outlined" onClick={() => navigate("/")}>
          Cancel
        </Button>
        <Button variant="contained" onClick={handleSubmit}>
          Submit
        </Button>
      </Stack>
    </PageLayout>
  );
}
