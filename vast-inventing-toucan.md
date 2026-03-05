# Conditional Logic Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add conditional visibility rules to the questionnaire prototype — builders configure IF/THEN logic on questions via a dialog, responders see questions shown/hidden in real time based on their answers.

**Architecture:** Logic metadata is stored on each *target* question (`question.logic`). Each rule says: "show/hide THIS question when [conditions about previous questions]". A pure forward-sweep evaluator (`src/logic.ts`) maps question IDs → visible booleans. RespondPage re-evaluates on every answer change via `useMemo`.

**Tech Stack:** React 19, TypeScript, MUI v7, Atlas design system, React Router v7, localStorage

**PRD source:** https://diligentbrands.atlassian.net/wiki/spaces/DQ/pages/6360563749/Conditional+Logic+Contingency+-+QST+4.x+PRDs
**Figma:** https://www.figma.com/design/KZfb5VxMwRlSsl8V3gW39U/Conditional-logic?node-id=80-8900

---

## Scope (prototype subset of PRD)

| PRD feature | In scope |
|---|---|
| Question-answer conditions | ✅ |
| Show/Hide action | ✅ |
| AND / OR combine | ✅ |
| NOT modifier per condition | ✅ |
| Forward-only constraint (enforced in UI) | ✅ |
| Cascading visibility | ✅ |
| Client-side evaluation (immediate UX) | ✅ |
| "Logic applied" badge in responder | ✅ |
| Visual indicator on builder question cards | ✅ |
| Pages/sections as targets | ❌ |
| User/group/variable conditions | ❌ |
| Reusable questionnaire-level conditions | ❌ |

---

## Key UI patterns (from Figma)

**Builder**: Each question card shows an "**Add logic**" button. When logic exists, a teal chip shows **"1 rule"** count. Clicking opens a **Dialog** to edit that question's conditions.

**Logic Dialog** structure (target-centric — configures "show/hide THIS question when…"):
```
┌─ Logic for: [Question text] ────────────────────────────────┐
│                                                              │
│  Show/Hide: [Show ▾]  this question when:                   │
│                                                              │
│  ┌─ Condition 1 ────────────────────────────── [🗑] ───┐    │
│  │  Question  [previous question dropdown ▾]           │    │
│  │  Operator  [Equals ▾]                               │    │
│  │  Value     [Option 1 ▾]                             │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                              │
│  ┌─ Condition 2 ────────────────────────────── [🗑] ───┐    │
│  │  …                                                  │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                              │
│  Combine conditions with: [AND ▾]                           │
│                                                              │
│  [+ Add condition]                                           │
│                                              [Cancel] [Save] │
└──────────────────────────────────────────────────────────────┘
```

**Responder**: Target questions that have logic applied show a teal **"Logic applied"** chip (top-right of card). Hidden questions are not rendered at all.

---

## Task 1: Extend the data model

**File:** `src/types.ts`

Append below the existing `Response` interface:

```typescript
export type ConditionOperator = "Exactly" | "OneOf" | "NotOneOf" | "All" | "Contains";
export type CombineOperator = "AND" | "OR";

export interface QuestionCondition {
  subjectType: "question";
  subjectId: string;    // ID of a previous question whose answer is evaluated
  operator: ConditionOperator;
  not: boolean;         // invert the result of this condition
  values: string[];     // option text values (choice) or search strings (text)
}

export interface ElementLogic {
  action: "show" | "hide";   // what happens when conditions evaluate to true
  combine: CombineOperator;
  conditions: QuestionCondition[];
}
```

Add `logic?: ElementLogic` to the `Question` interface (after `required: boolean`):

```typescript
  required: boolean;
  logic?: ElementLogic;
```

**Verify:** `npm run build` — no TS errors.

---

## Task 2: Create the logic evaluation utility

**File:** `src/logic.ts` (create new)

```typescript
import type { Question, QuestionCondition, AnswerValue } from "./types.js";

function evaluateCondition(
  condition: QuestionCondition,
  answer: AnswerValue | undefined,
  driverType: Question["type"],
): boolean {
  if (
    answer === undefined ||
    answer === "" ||
    (Array.isArray(answer) && answer.length === 0)
  ) {
    return false;
  }
  const parts = Array.isArray(answer) ? answer : [String(answer)];

  switch (condition.operator) {
    case "Exactly":
      return parts.length === 1 && parts[0] === condition.values[0];
    case "OneOf":
      return parts.some((a) => condition.values.includes(a));
    case "NotOneOf":
      return !parts.some((a) => condition.values.includes(a));
    case "All":
      return condition.values.every((v) => parts.includes(v));
    case "Contains":
      if (driverType === "text") {
        return condition.values.some((v) =>
          parts[0].toLowerCase().includes(v.toLowerCase()),
        );
      }
      return parts.some((a) => condition.values.includes(a));
  }
}

/**
 * Single forward sweep returning questionId → visible boolean.
 * PRD rule: a condition referencing a hidden driver evaluates to false.
 */
export function evaluateVisibility(
  questions: Question[],
  answers: Record<string, AnswerValue>,
): Record<string, boolean> {
  const visibility: Record<string, boolean> = {};

  for (const q of questions) {
    if (!q.logic || q.logic.conditions.length === 0) {
      visibility[q.id] = true;
      continue;
    }

    const results = q.logic.conditions.map((cond) => {
      const driver = questions.find((d) => d.id === cond.subjectId);
      // Driver missing or hidden → condition evaluates to false (PRD §8.4)
      if (!driver || !visibility[driver.id]) return cond.not;
      const raw = evaluateCondition(cond, answers[cond.subjectId], driver.type);
      return cond.not ? !raw : raw;
    });

    const met =
      q.logic.combine === "AND" ? results.every(Boolean) : results.some(Boolean);

    visibility[q.id] = q.logic.action === "show" ? met : !met;
  }

  return visibility;
}

/**
 * Remove conditions referencing question IDs that no longer exist.
 * Call after deleteQuestion or moveQuestion in BuilderPage.
 */
export function cleanOrphanedConditions(questions: Question[]): Question[] {
  const ids = new Set(questions.map((q) => q.id));
  return questions.map((q) => {
    if (!q.logic) return q;
    const conditions = q.logic.conditions.filter((c) => ids.has(c.subjectId));
    return {
      ...q,
      logic: conditions.length === 0 ? undefined : { ...q.logic, conditions },
    };
  });
}
```

**Verify:** `npm run build` — no TS errors.

---

## Task 3: Create the LogicDialog component

**File:** `src/components/LogicDialog.tsx` (create new)

This is the modal editor for one question's conditional logic.

```tsx
import { useState, useEffect } from "react";
import {
  Button,
  Checkbox,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  FormControlLabel,
  FormGroup,
  IconButton,
  MenuItem,
  Select,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import AddIcon from "@diligentcorp/atlas-react-bundle/icons/Add";
import TrashIcon from "@diligentcorp/atlas-react-bundle/icons/Trash";
import type {
  Question,
  QuestionType,
  ConditionOperator,
  CombineOperator,
  ElementLogic,
  QuestionCondition,
} from "../types.js";

interface Props {
  open: boolean;
  question: Question;           // the TARGET question being configured
  previousQuestions: Question[]; // available driving questions (before this one)
  onClose: () => void;
  onSave: (logic: ElementLogic | undefined) => void;
}

const OPERATORS_FOR_TYPE: Record<QuestionType, ConditionOperator[]> = {
  text: ["Contains", "Exactly"],
  "single-select": ["Exactly", "OneOf", "NotOneOf"],
  "multiple-choice": ["OneOf", "NotOneOf", "All", "Contains"],
};

const OPERATOR_LABELS: Record<ConditionOperator, string> = {
  Exactly: "exactly equals",
  OneOf: "is one of",
  NotOneOf: "is not one of",
  All: "includes all of",
  Contains: "contains",
};

function makeDefaultCondition(driver: Question): QuestionCondition {
  const ops = OPERATORS_FOR_TYPE[driver.type];
  return {
    subjectType: "question",
    subjectId: driver.id,
    operator: ops[0],
    not: false,
    values: driver.options?.length ? [driver.options[0]] : [],
  };
}

export default function LogicDialog({
  open,
  question,
  previousQuestions,
  onClose,
  onSave,
}: Props) {
  const [action, setAction] = useState<"show" | "hide">("show");
  const [combine, setCombine] = useState<CombineOperator>("AND");
  const [conditions, setConditions] = useState<QuestionCondition[]>([]);

  // Sync internal state when dialog opens
  useEffect(() => {
    if (open) {
      if (question.logic) {
        setAction(question.logic.action);
        setCombine(question.logic.combine);
        setConditions(question.logic.conditions);
      } else {
        setAction("show");
        setCombine("AND");
        setConditions(
          previousQuestions.length > 0
            ? [makeDefaultCondition(previousQuestions[previousQuestions.length - 1])]
            : [],
        );
      }
    }
  }, [open, question, previousQuestions]);

  function addCondition() {
    if (!previousQuestions.length) return;
    setConditions((cs) => [
      ...cs,
      makeDefaultCondition(previousQuestions[previousQuestions.length - 1]),
    ]);
  }

  function updateCondition(i: number, patch: Partial<QuestionCondition>) {
    setConditions((cs) => cs.map((c, idx) => (idx === i ? { ...c, ...patch } : c)));
  }

  function removeCondition(i: number) {
    setConditions((cs) => cs.filter((_, idx) => idx !== i));
  }

  function handleSave() {
    if (conditions.length === 0) {
      onSave(undefined);
    } else {
      onSave({ action, combine, conditions });
    }
  }

  function handleDriverChange(i: number, driverId: string) {
    const driver = previousQuestions.find((pq) => pq.id === driverId);
    if (!driver) return;
    const ops = OPERATORS_FOR_TYPE[driver.type];
    updateCondition(i, {
      subjectId: driverId,
      operator: ops[0],
      values: driver.options?.length ? [driver.options[0]] : [],
    });
  }

  const questionLabel = (q: Question, index: number) =>
    q.text.trim() || `Question ${index + 1}`;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        Logic for:{" "}
        <Typography component="span" fontWeight={600}>
          {question.text.trim() ||
            `Question ${previousQuestions.length + 1}`}
        </Typography>
      </DialogTitle>

      <DialogContent>
        <Stack gap={3} pt={1}>
          {/* Action row */}
          <Stack direction="row" alignItems="center" gap={1} flexWrap="wrap">
            <Select
              value={action}
              onChange={(e) => setAction(e.target.value as "show" | "hide")}
              sx={{ minWidth: 100 }}
            >
              <MenuItem value="show">Show</MenuItem>
              <MenuItem value="hide">Hide</MenuItem>
            </Select>
            <Typography>this question when</Typography>
            {conditions.length > 1 && (
              <>
                <Select
                  value={combine}
                  onChange={(e) => setCombine(e.target.value as CombineOperator)}
                  sx={{ minWidth: 80 }}
                >
                  <MenuItem value="AND">ALL</MenuItem>
                  <MenuItem value="OR">ANY</MenuItem>
                </Select>
                <Typography>of these conditions are met:</Typography>
              </>
            )}
          </Stack>

          {/* Conditions */}
          {conditions.length === 0 && (
            <Typography color="text.secondary" variant="body1">
              No conditions yet — add one below.
            </Typography>
          )}

          {conditions.map((cond, ci) => {
            const driver = previousQuestions.find((pq) => pq.id === cond.subjectId);
            const availableOps = driver
              ? OPERATORS_FOR_TYPE[driver.type]
              : (Object.keys(OPERATOR_LABELS) as ConditionOperator[]);

            return (
              <Stack
                key={ci}
                gap={1.5}
                sx={{
                  p: 2,
                  border: "1px solid",
                  borderColor: "divider",
                  borderRadius: 2,
                }}
              >
                <Stack
                  direction="row"
                  alignItems="center"
                  justifyContent="space-between"
                >
                  <Typography variant="subtitle2">
                    Condition {ci + 1}
                  </Typography>
                  <Tooltip title="Remove condition">
                    <IconButton size="small" onClick={() => removeCondition(ci)}>
                      <TrashIcon />
                    </IconButton>
                  </Tooltip>
                </Stack>

                <Divider />

                {/* NOT toggle */}
                <FormControlLabel
                  control={
                    <Checkbox
                      size="small"
                      checked={cond.not}
                      onChange={(e) => updateCondition(ci, { not: e.target.checked })}
                    />
                  }
                  label={<Typography variant="body1">NOT (invert condition)</Typography>}
                />

                {/* Question dropdown */}
                <Stack gap={0.5}>
                  <Typography variant="body1" color="text.secondary">
                    Question
                  </Typography>
                  <Select
                    value={cond.subjectId}
                    onChange={(e) => handleDriverChange(ci, e.target.value)}
                    displayEmpty
                  >
                    {previousQuestions.map((pq, pi) => (
                      <MenuItem key={pq.id} value={pq.id}>
                        {questionLabel(pq, pi)}
                      </MenuItem>
                    ))}
                  </Select>
                </Stack>

                {/* Operator dropdown */}
                <Stack gap={0.5}>
                  <Typography variant="body1" color="text.secondary">
                    Operator
                  </Typography>
                  <Select
                    value={cond.operator}
                    onChange={(e) =>
                      updateCondition(ci, {
                        operator: e.target.value as ConditionOperator,
                        values: [],
                      })
                    }
                  >
                    {availableOps.map((op) => (
                      <MenuItem key={op} value={op}>
                        {OPERATOR_LABELS[op]}
                      </MenuItem>
                    ))}
                  </Select>
                </Stack>

                {/* Value input */}
                {driver && (
                  <Stack gap={0.5}>
                    <Typography variant="body1" color="text.secondary">
                      Value
                    </Typography>
                    <ConditionValueInput
                      driver={driver}
                      operator={cond.operator}
                      values={cond.values}
                      onChange={(values) => updateCondition(ci, { values })}
                    />
                  </Stack>
                )}
              </Stack>
            );
          })}

          {previousQuestions.length > 0 && (
            <Button
              variant="text"
              startIcon={<AddIcon />}
              onClick={addCondition}
              sx={{ alignSelf: "flex-start" }}
            >
              Add condition
            </Button>
          )}

          {previousQuestions.length === 0 && (
            <Typography variant="body1" color="text.secondary">
              Move this question after another question to add conditions.
            </Typography>
          )}
        </Stack>
      </DialogContent>

      <DialogActions>
        {question.logic && (
          <Button
            variant="text"
            color="destructive"
            onClick={() => onSave(undefined)}
            sx={{ mr: "auto" }}
          >
            Remove logic
          </Button>
        )}
        <Button variant="outlined" onClick={onClose}>
          Cancel
        </Button>
        <Button variant="contained" onClick={handleSave}>
          Save
        </Button>
      </DialogActions>
    </Dialog>
  );
}

// ── Value input sub-component ──────────────────────────────────────────────

interface ConditionValueInputProps {
  driver: Question;
  operator: ConditionOperator;
  values: string[];
  onChange: (values: string[]) => void;
}

function ConditionValueInput({
  driver,
  operator,
  values,
  onChange,
}: ConditionValueInputProps) {
  if (driver.type === "text") {
    return (
      <TextField
        value={values[0] ?? ""}
        onChange={(e) => onChange([e.target.value])}
        fullWidth
        placeholder={
          operator === "Contains" ? "Text to search for" : "Exact match value"
        }
      />
    );
  }

  const opts = driver.options ?? [];
  const multiSelect =
    operator === "OneOf" ||
    operator === "NotOneOf" ||
    operator === "All" ||
    operator === "Contains";

  if (!multiSelect) {
    return (
      <Select
        value={values[0] ?? ""}
        onChange={(e) => onChange([e.target.value])}
        displayEmpty
      >
        {opts.map((opt) => (
          <MenuItem key={opt} value={opt}>
            {opt}
          </MenuItem>
        ))}
      </Select>
    );
  }

  return (
    <FormGroup row>
      {opts.map((opt) => (
        <FormControlLabel
          key={opt}
          control={
            <Checkbox
              size="small"
              checked={values.includes(opt)}
              onChange={(e) => {
                if (e.target.checked) onChange([...values, opt]);
                else onChange(values.filter((v) => v !== opt));
              }}
            />
          }
          label={opt}
        />
      ))}
    </FormGroup>
  );
}
```

**Verify:** `npm run build` — no TS errors.

---

## Task 4: Add "Add logic" button + indicator to BuilderPage question cards

**File:** `src/pages/BuilderPage.tsx`

### 4a — Add imports

```typescript
import { useState, useEffect } from "react";
import { Chip } from "@mui/material";
import LogicIcon from "@diligentcorp/atlas-react-bundle/icons/Questionnaires";
import { cleanOrphanedConditions } from "../logic.js";
import LogicDialog from "../components/LogicDialog.js";
import type { ElementLogic } from "../types.js";
```

### 4b — Add state for which question's logic dialog is open

```typescript
  const [logicTargetId, setLogicTargetId] = useState<string | null>(null);
```

### 4c — Update `deleteQuestion` and `moveQuestion` to clean orphans

Replace `deleteQuestion`:
```typescript
  function deleteQuestion(index: number) {
    setQuestions((qs) => cleanOrphanedConditions(qs.filter((_, i) => i !== index)));
  }
```

Replace `moveQuestion`:
```typescript
  function moveQuestion(from: number, to: number) {
    setQuestions((qs) => {
      const arr = [...qs];
      const [item] = arr.splice(from, 1);
      arr.splice(to, 0, item);
      return cleanOrphanedConditions(arr);
    });
  }
```

### 4d — Add logic save handler

```typescript
  function handleLogicSave(logic: ElementLogic | undefined) {
    if (!logicTargetId) return;
    setQuestions((qs) =>
      qs.map((q) => (q.id === logicTargetId ? { ...q, logic } : q)),
    );
    setLogicTargetId(null);
  }
```

### 4e — Add "Add logic" button and logic indicator to each question card

The `questions.map(...)` in the JSX renders `<QuestionEditor>` components. Wrap each one in a relative-positioned `<Stack>` and add the button + chip. Replace:

```tsx
        {questions.map((q, i) => (
          <QuestionEditor
            key={q.id}
            ...
          />
        ))}
```

With:

```tsx
        {questions.map((q, i) => (
          <Stack key={q.id} position="relative">
            <QuestionEditor
              question={q}
              index={i}
              total={questions.length}
              onChange={(updated) => updateQuestion(i, updated)}
              onDelete={() => deleteQuestion(i)}
              onMoveUp={() => moveQuestion(i, i - 1)}
              onMoveDown={() => moveQuestion(i, i + 1)}
            />
            <Stack
              direction="row"
              gap={1}
              sx={{ position: "absolute", top: 8, right: 52 }}
            >
              {q.logic && (
                <Chip
                  icon={<LogicIcon />}
                  label="1 rule"
                  size="small"
                  color="info"
                  variant="outlined"
                />
              )}
              <Button
                variant="text"
                size="small"
                startIcon={<LogicIcon />}
                onClick={() => setLogicTargetId(q.id)}
                sx={{ whiteSpace: "nowrap" }}
              >
                {q.logic ? "Edit logic" : "Add logic"}
              </Button>
            </Stack>
          </Stack>
        ))}
```

### 4f — Add LogicDialog before the closing `</PageLayout>` tag

```tsx
      {logicTargetId && (() => {
        const idx = questions.findIndex((q) => q.id === logicTargetId);
        const q = questions[idx];
        return (
          <LogicDialog
            open={true}
            question={q}
            previousQuestions={questions.slice(0, idx)}
            onClose={() => setLogicTargetId(null)}
            onSave={handleLogicSave}
          />
        );
      })()}
```

**Verify:** `npm run build` — no TS errors.

---

## Task 5: Integrate visibility evaluation in RespondPage

**File:** `src/pages/RespondPage.tsx`

### 5a — Add imports

```typescript
import { useState, useMemo } from "react";
import { Chip } from "@mui/material";
import { evaluateVisibility } from "../logic.js";
```

### 5b — Compute visibility map (add after `answers` state)

```typescript
  const visibility = useMemo(
    () => evaluateVisibility(questionnaire.questions, answers),
    [questionnaire.questions, answers],
  );
```

### 5c — Filter to visible questions and add "Logic applied" badge

In the `Stack gap={3}` that maps over questions, replace:
```tsx
        {questionnaire.questions.map((q, i) => (
          <Card key={q.id} variant="outlined">
            <CardContent>
              <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                Question {i + 1}
                {q.required ? " *" : ""}
              </Typography>
```

With:
```tsx
        {questionnaire.questions
          .filter((q) => visibility[q.id] !== false)
          .map((q, i) => (
          <Card key={q.id} variant="outlined">
            <CardContent>
              <Stack direction="row" alignItems="center" justifyContent="space-between" mb={0.5}>
                <Typography variant="subtitle2" color="text.secondary">
                  Question {i + 1}
                  {q.required ? " *" : ""}
                </Typography>
                {q.logic && (
                  <Chip label="Logic applied" size="small" color="info" />
                )}
              </Stack>
```

### 5d — Skip hidden questions in required validation

```typescript
    for (const q of questionnaire!.questions) {
      if (q.required && visibility[q.id] !== false) {
        const val = answers[q.id];
        if (!val || (Array.isArray(val) && val.length === 0) || val === "") {
          setError(`Please answer the required question: "${q.text}"`);
          return;
        }
      }
    }
```

### 5e — Only save answers for visible questions

```typescript
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
```

**Verify:** `npm run build` — no TS errors.

---

## Task 6: Final build and smoke test

**Step 1:** `npm run build` — clean build, 0 TS errors

**Step 2:** `npm run dev` — open in browser

**Step 3:** Smoke test — create questionnaire:
- Q1: Single-select "Do you have pets?" — options: Yes, No
- Q2: Text "What kind?" — click **Add logic** → Show when Q1 exactly equals "Yes"
- Q3: Text "Why not?" — click **Add logic** → Show when Q1 exactly equals "No"

**Step 4:** Check builder:
- Q2 and Q3 show **"1 rule"** chip and **"Edit logic"** button
- Q1 shows only **"Add logic"** button (no rule chip)

**Step 5:** Respond:
- Before answering Q1 → Q2 and Q3 hidden (action=show, conditions not met)
- Select "Yes" → Q2 visible with "Logic applied" badge, Q3 hidden
- Select "No" → Q3 visible with "Logic applied" badge, Q2 hidden

**Step 6:** Submit and check Results — only the answered questions appear in results.

---

## File summary

| File | Change |
|---|---|
| `src/types.ts` | Add `ConditionOperator`, `CombineOperator`, `QuestionCondition`, `ElementLogic`; add `logic?` to `Question` |
| `src/logic.ts` | Create — `evaluateVisibility()` + `cleanOrphanedConditions()` |
| `src/components/LogicDialog.tsx` | Create — Dialog for editing one question's logic |
| `src/pages/BuilderPage.tsx` | Add "Add logic" button + logic chip per question card; import `cleanOrphanedConditions` |
| `src/pages/RespondPage.tsx` | Visibility evaluation, filter hidden questions, "Logic applied" badge |
| `src/components/QuestionEditor.tsx` | No changes needed |
| `src/pages/ResultsPage.tsx` | No changes needed |
