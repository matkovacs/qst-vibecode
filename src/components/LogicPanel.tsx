import { useState } from "react";
import {
  Button,
  Divider,
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
  QuestionRule,
} from "../types.js";

interface Props {
  question: Question;
  otherQuestions: Question[];
  onClose: () => void;
  onSave: (rules: QuestionRule[] | undefined) => void;
}

const OPERATORS_FOR_TYPE: Record<QuestionType, ConditionOperator[]> = {
  text: ["Equals", "Contains"],
  "single-select": ["Equals", "OneOf", "NotOneOf"],
  "multiple-choice": ["OneOf", "NotOneOf"],
};

const OPERATOR_LABELS: Record<ConditionOperator, string> = {
  Equals: "Equals",
  Contains: "Contains",
  OneOf: "Is one of",
  NotOneOf: "Is not one of",
};

function FieldLabel({ children }: { children: string }) {
  return (
    <Typography variant="subtitle2" sx={{ fontSize: 12, fontWeight: 600, letterSpacing: 0.3 }}>
      {children}
    </Typography>
  );
}

export default function LogicPanel({ question, otherQuestions, onClose, onSave }: Props) {
  const availableOps = OPERATORS_FOR_TYPE[question.type];
  const isChoiceQuestion =
    question.type === "single-select" || question.type === "multiple-choice";
  const opts = question.options ?? [];

  function makeDefaultRule(): QuestionRule {
    return {
      operator: availableOps[0],
      value: isChoiceQuestion ? (opts[0] ?? "") : "",
      action: "show",
      targetId: otherQuestions[0]?.id ?? "",
    };
  }

  function sanitizeRule(r: QuestionRule): QuestionRule {
    const validTarget = otherQuestions.some((oq) => oq.id === r.targetId)
      ? r.targetId
      : (otherQuestions[0]?.id ?? "");
    return { ...r, targetId: validTarget };
  }

  const [rules, setRules] = useState<QuestionRule[]>(
    question.rules?.length ? question.rules.map(sanitizeRule) : [makeDefaultRule()],
  );

  function updateRule(idx: number, patch: Partial<QuestionRule>) {
    setRules((rs) => rs.map((r, i) => (i === idx ? { ...r, ...patch } : r)));
  }

  function removeRule(idx: number) {
    setRules((rs) => rs.filter((_, i) => i !== idx));
  }

  function addRule() {
    setRules((rs) => [...rs, makeDefaultRule()]);
  }

  function handleApply() {
    const valid = rules.filter((r) => r.targetId);
    onSave(valid.length ? valid : undefined);
  }

  const hasExistingRules = (question.rules?.length ?? 0) > 0;

  return (
    <Stack gap={3}>
      <Divider />

      {/* Source question — shown once above all rules */}
      <Stack gap={0.5}>
        <FieldLabel>Question</FieldLabel>
        <TextField
          value={question.text.trim() || "Untitled question"}
          fullWidth
          InputProps={{ readOnly: true }}
          sx={{ "& .MuiInputBase-root": { bgcolor: "action.hover" } }}
        />
      </Stack>

      {/* Rule cards */}
      {rules.map((rule, ri) => (
        <Stack
          key={ri}
          gap={2}
          sx={{ p: 2, border: "1px solid", borderColor: "divider", borderRadius: 2 }}
        >
          {/* Card header */}
          <Stack direction="row" alignItems="center" justifyContent="space-between">
            <Typography variant="subtitle2" color="text.secondary">
              Rule {ri + 1}
            </Typography>
            <Tooltip title="Remove rule">
              <IconButton size="small" onClick={() => removeRule(ri)}>
                <TrashIcon />
              </IconButton>
            </Tooltip>
          </Stack>

          <Divider />

          {/* Condition */}
          <Typography sx={{ fontSize: 14, fontWeight: 600 }}>Condition</Typography>

          <Stack gap={0.5}>
            <FieldLabel>Operator</FieldLabel>
            <Select
              value={rule.operator}
              onChange={(e) =>
                updateRule(ri, {
                  operator: e.target.value as ConditionOperator,
                  value: isChoiceQuestion ? (opts[0] ?? "") : "",
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

          <Stack gap={0.5}>
            <FieldLabel>Value</FieldLabel>
            {isChoiceQuestion ? (
              <Select
                value={rule.value}
                onChange={(e) => updateRule(ri, { value: e.target.value })}
                displayEmpty
              >
                {opts.length === 0 ? (
                  <MenuItem value="" disabled>
                    No options defined
                  </MenuItem>
                ) : (
                  opts.map((opt) => (
                    <MenuItem key={opt} value={opt}>
                      {opt}
                    </MenuItem>
                  ))
                )}
              </Select>
            ) : (
              <TextField
                value={rule.value}
                onChange={(e) => updateRule(ri, { value: e.target.value })}
                fullWidth
                placeholder={
                  rule.operator === "Contains" ? "Text to search for" : "Exact match value"
                }
              />
            )}
          </Stack>

          {/* Action */}
          <Typography sx={{ fontSize: 14, fontWeight: 600 }}>Action</Typography>

          <Stack gap={0.5}>
            <FieldLabel>Action type</FieldLabel>
            <Select
              value={rule.action}
              onChange={(e) => updateRule(ri, { action: e.target.value as "show" | "hide" })}
              sx={{ maxWidth: 240 }}
            >
              <MenuItem value="show">Show</MenuItem>
              <MenuItem value="hide">Hide</MenuItem>
            </Select>
          </Stack>

          <Stack gap={0.5}>
            <FieldLabel>Target</FieldLabel>
            {otherQuestions.length === 0 ? (
              <Typography variant="body1" color="text.secondary">
                Add more questions to select a target.
              </Typography>
            ) : (
              <Select
                value={rule.targetId}
                onChange={(e) => updateRule(ri, { targetId: e.target.value })}
                displayEmpty
              >
                {otherQuestions.map((oq, idx) => (
                  <MenuItem key={oq.id} value={oq.id}>
                    {oq.text.trim() || `Question ${idx + 1}`}
                  </MenuItem>
                ))}
              </Select>
            )}
          </Stack>
        </Stack>
      ))}

      {/* Add rule */}
      {otherQuestions.length > 0 && (
        <Button
          variant="text"
          startIcon={<AddIcon />}
          onClick={addRule}
          sx={{ alignSelf: "flex-start" }}
        >
          Add rule
        </Button>
      )}

      <Divider />

      {/* Footer */}
      <Stack direction="row" alignItems="center" gap={2}>
        {hasExistingRules && (
          <Button
            variant="text"
            onClick={() => onSave(undefined)}
            sx={{ mr: "auto", color: "error.main" }}
          >
            Remove all logic
          </Button>
        )}
        <Button
          variant="outlined"
          onClick={onClose}
          sx={{ ml: hasExistingRules ? 0 : "auto" }}
        >
          Cancel
        </Button>
        <Button
          variant="contained"
          onClick={handleApply}
          disabled={otherQuestions.length === 0}
        >
          Apply logic
        </Button>
      </Stack>
    </Stack>
  );
}
