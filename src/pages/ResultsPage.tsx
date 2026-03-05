import { useNavigate, useParams, NavLink } from "react-router";
import { PageHeader, OverflowBreadcrumbs } from "@diligentcorp/atlas-react-bundle";
import { Button, Card, CardContent, Divider, Stack, Typography } from "@mui/material";

import PageLayout from "../components/PageLayout.js";
import { getQuestionnaire, getResponses } from "../storage.js";
import type { Question } from "../types.js";

export default function ResultsPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const questionnaire = id ? getQuestionnaire(id) : undefined;
  const responses = id ? getResponses(id) : [];

  if (!questionnaire) {
    return (
      <PageLayout>
        <Typography>Questionnaire not found.</Typography>
      </PageLayout>
    );
  }

  function getAnswersForQuestion(q: Question): string[] {
    return responses.flatMap((r) => {
      const answer = r.answers.find((a) => a.questionId === q.id);
      if (!answer) return [];
      if (Array.isArray(answer.value)) return answer.value;
      return [String(answer.value)];
    });
  }

  function tallyOptions(values: string[], options: string[]): Record<string, number> {
    const tally: Record<string, number> = {};
    for (const opt of options) tally[opt] = 0;
    for (const v of values) {
      if (v in tally) tally[v]++;
    }
    return tally;
  }

  return (
    <PageLayout>
      <PageHeader
        pageTitle={`Results: ${questionnaire.title}`}
        pageSubtitle={`${responses.length} response${responses.length !== 1 ? "s" : ""} total`}
        breadcrumbs={
          <OverflowBreadcrumbs
            leadingElement={<span>Questionnaire App</span>}
            items={[
              { id: "home", label: "Questionnaires", url: "/" },
              { id: "results", label: "Results", url: `/results/${id}` },
            ]}
            hideLastItem={true}
            aria-label="Breadcrumbs"
          >
            {({ label, url }) => <NavLink to={url}>{label}</NavLink>}
          </OverflowBreadcrumbs>
        }
      />

      {responses.length === 0 ? (
        <Stack alignItems="center" py={6} gap={2}>
          <Typography color="text.secondary">No responses yet.</Typography>
          <Button variant="outlined" onClick={() => navigate(`/respond/${id}`)}>
            Be the first to respond
          </Button>
        </Stack>
      ) : (
        <Stack gap={3}>
          {questionnaire.questions.map((q, i) => {
            const answers = getAnswersForQuestion(q);
            return (
              <Card key={q.id} variant="outlined">
                <CardContent>
                  <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                    Question {i + 1}
                  </Typography>
                  <Typography variant="body1" fontWeight={500} gutterBottom>
                    {q.text}
                  </Typography>
                  <Divider sx={{ my: 1 }} />
                  {q.type === "text" ? (
                    <Stack gap={1}>
                      {answers.filter(Boolean).length === 0 ? (
                        <Typography variant="body1" color="text.secondary">
                          No answers.
                        </Typography>
                      ) : (
                        answers.filter(Boolean).map((ans, idx) => (
                          <Typography
                            key={idx}
                            variant="body1"
                            sx={{
                              pl: 1.5,
                              borderLeft: "3px solid",
                              borderColor: "divider",
                            }}
                          >
                            {ans}
                          </Typography>
                        ))
                      )}
                    </Stack>
                  ) : (
                    <Stack gap={0.5}>
                      {Object.entries(tallyOptions(answers, q.options ?? [])).map(
                        ([opt, count]) => (
                          <Stack key={opt} direction="row" gap={2} alignItems="center">
                            <Typography variant="body1" flex={1}>
                              {opt}
                            </Typography>
                            <Typography variant="body1" fontWeight={600}>
                              {count}
                            </Typography>
                            <Typography variant="body1" color="text.secondary">
                              (
                              {responses.length > 0
                                ? Math.round((count / responses.length) * 100)
                                : 0}
                              %)
                            </Typography>
                          </Stack>
                        ),
                      )}
                    </Stack>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </Stack>
      )}

      <Stack direction="row" pb={4}>
        <Button variant="outlined" onClick={() => navigate("/")}>
          Back to Questionnaires
        </Button>
      </Stack>
    </PageLayout>
  );
}
