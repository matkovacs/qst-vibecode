import { useState, useEffect } from "react";
import { useNavigate, useParams, NavLink } from "react-router";
import { PageHeader, OverflowBreadcrumbs } from "@diligentcorp/atlas-react-bundle";
import { Button, Chip, Stack, TextField, Typography } from "@mui/material";
import AddIcon from "@diligentcorp/atlas-react-bundle/icons/Add";
import LogicIcon from "@diligentcorp/atlas-react-bundle/icons/Flows";

import PageLayout from "../components/PageLayout.js";
import QuestionEditor from "../components/QuestionEditor.js";
import LogicPanel from "../components/LogicPanel.js";
import { getQuestionnaire, saveQuestionnaire } from "../storage.js";
import { cleanOrphanedRules } from "../logic.js";
import type { Question, Questionnaire, QuestionRule } from "../types.js";

function newQuestion(): Question {
  return {
    id: crypto.randomUUID(),
    text: "",
    type: "text",
    required: false,
  };
}

export default function BuilderPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isNew = id === undefined;

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [questions, setQuestions] = useState<Question[]>([newQuestion()]);
  const [titleError, setTitleError] = useState(false);
  const [logicTargetId, setLogicTargetId] = useState<string | null>(null);

  useEffect(() => {
    if (!isNew && id) {
      const q = getQuestionnaire(id);
      if (q) {
        setTitle(q.title);
        setDescription(q.description ?? "");
        setQuestions(q.questions);
      }
    }
  }, [id, isNew]);

  function handleSave() {
    if (!title.trim()) {
      setTitleError(true);
      return;
    }
    const existing = !isNew && id ? getQuestionnaire(id) : undefined;
    const questionnaire: Questionnaire = {
      id: id ?? crypto.randomUUID(),
      title: title.trim(),
      description: description.trim() || undefined,
      questions,
      createdAt: existing?.createdAt ?? new Date().toISOString(),
    };
    saveQuestionnaire(questionnaire);
    navigate("/");
  }

  function updateQuestion(index: number, q: Question) {
    setQuestions((qs) => qs.map((existing, i) => (i === index ? q : existing)));
  }

  function deleteQuestion(index: number) {
    setQuestions((qs) => cleanOrphanedRules(qs.filter((_, i) => i !== index)));
  }

  function moveQuestion(from: number, to: number) {
    setQuestions((qs) => {
      const arr = [...qs];
      const [item] = arr.splice(from, 1);
      arr.splice(to, 0, item);
      return arr;
    });
  }

  function handleRuleSave(rules: QuestionRule[] | undefined) {
    if (!logicTargetId) return;
    setQuestions((qs) => qs.map((q) => (q.id === logicTargetId ? { ...q, rules } : q)));
    setLogicTargetId(null);
  }

  const pageTitle = isNew ? "New Questionnaire" : "Edit Questionnaire";

  return (
    <PageLayout>
      <PageHeader
        pageTitle={pageTitle}
        breadcrumbs={
          <OverflowBreadcrumbs
            leadingElement={<span>Questionnaire App</span>}
            items={[
              { id: "home", label: "Questionnaires", url: "/" },
              {
                id: "builder",
                label: pageTitle,
                url: isNew ? "/builder/new" : `/builder/${id}`,
              },
            ]}
            hideLastItem={true}
            aria-label="Breadcrumbs"
          >
            {({ label, url }) => <NavLink to={url}>{label}</NavLink>}
          </OverflowBreadcrumbs>
        }
      />

      <Stack gap={2}>
        <TextField
          label="Title"
          value={title}
          onChange={(e) => {
            setTitle(e.target.value);
            setTitleError(false);
          }}
          required
          error={titleError}
          helperText={titleError ? "Title is required" : undefined}
          fullWidth
        />
        <TextField
          label="Description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          fullWidth
          multiline
          minRows={2}
          placeholder="Optional description"
        />
      </Stack>

      <Stack gap={2} mt={1}>
        <Typography variant="h6">Questions</Typography>
        {questions.map((q, i) => {
          const isLogicOpen = logicTargetId === q.id;
          const otherQuestions = questions.filter((oq) => oq.id !== q.id);
          return (
            <QuestionEditor
              key={q.id}
              question={q}
              index={i}
              total={questions.length}
              onChange={(updated) => updateQuestion(i, updated)}
              onDelete={() => deleteQuestion(i)}
              onMoveUp={() => moveQuestion(i, i - 1)}
              onMoveDown={() => moveQuestion(i, i + 1)}
              logicButton={
                <Stack direction="row" gap={0.5} alignItems="center">
                  {q.rules?.length && !isLogicOpen ? (
                    <Chip
                      icon={<LogicIcon />}
                      label={`${q.rules.length} rule${q.rules.length > 1 ? "s" : ""}`}
                      size="small"
                      color="info"
                      variant="outlined"
                    />
                  ) : null}
                  <Button
                    variant={isLogicOpen ? "contained" : "outlined"}
                    size="small"
                    startIcon={<LogicIcon />}
                    onClick={() => setLogicTargetId(isLogicOpen ? null : q.id)}
                    sx={{ whiteSpace: "nowrap" }}
                  >
                    {q.rules?.length ? "Edit logic" : "Add logic"}
                  </Button>
                </Stack>
              }
              logicPanel={
                isLogicOpen ? (
                  <LogicPanel
                    question={q}
                    otherQuestions={otherQuestions}
                    onClose={() => setLogicTargetId(null)}
                    onSave={handleRuleSave}
                  />
                ) : undefined
              }
            />
          );
        })}
        <Button
          variant="outlined"
          startIcon={<AddIcon />}
          onClick={() => setQuestions((qs) => [...qs, newQuestion()])}
          sx={{ alignSelf: "flex-start" }}
        >
          Add Question
        </Button>
      </Stack>

      <Stack direction="row" gap={2} justifyContent="flex-end" pb={4}>
        <Button variant="outlined" onClick={() => navigate("/")}>
          Cancel
        </Button>
        <Button variant="contained" onClick={handleSave}>
          Save
        </Button>
      </Stack>
    </PageLayout>
  );
}
