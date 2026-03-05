import {
  Button,
  Checkbox,
  Divider,
  FormControl,
  FormControlLabel,
  IconButton,
  MenuItem,
  Select,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import type { ReactNode } from "react";
import AddIcon from "@diligentcorp/atlas-react-bundle/icons/Add";
import TrashIcon from "@diligentcorp/atlas-react-bundle/icons/Trash";
import ArrowUpIcon from "@diligentcorp/atlas-react-bundle/icons/ArrowUp";
import ArrowDownIcon from "@diligentcorp/atlas-react-bundle/icons/ArrowDown";
import type { Question, QuestionType } from "../types.js";

interface Props {
  question: Question;
  index: number;
  total: number;
  onChange: (q: Question) => void;
  onDelete: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  logicButton?: ReactNode;
  logicPanel?: ReactNode;
}

const TYPE_LABELS: Record<QuestionType, string> = {
  text: "Text",
  "multiple-choice": "Multiple Choice",
  "single-select": "Single Select",
};

export default function QuestionEditor({
  question,
  index,
  total,
  onChange,
  onDelete,
  onMoveUp,
  onMoveDown,
  logicButton,
  logicPanel,
}: Props) {
  function setField<K extends keyof Question>(key: K, value: Question[K]) {
    onChange({ ...question, [key]: value });
  }

  function handleTypeChange(type: QuestionType) {
    const needsOptions = type === "multiple-choice" || type === "single-select";
    onChange({
      ...question,
      type,
      options: needsOptions
        ? question.options?.length
          ? question.options
          : ["Option 1"]
        : undefined,
    });
  }

  function handleOptionChange(i: number, value: string) {
    const options = [...(question.options ?? [])];
    options[i] = value;
    setField("options", options);
  }

  function addOption() {
    setField("options", [
      ...(question.options ?? []),
      `Option ${(question.options?.length ?? 0) + 1}`,
    ]);
  }

  function removeOption(i: number) {
    setField(
      "options",
      (question.options ?? []).filter((_, idx) => idx !== i),
    );
  }

  const hasOptions =
    question.type === "multiple-choice" || question.type === "single-select";

  return (
    <Stack
      gap={3}
      sx={{
        border: "1px solid",
        borderColor: "divider",
        borderRadius: 2,
        p: 3,
        bgcolor: "background.paper",
      }}
    >
      {/* Top row: question title + logic button */}
      <Stack direction="row" gap={3} alignItems="flex-start">
        <Stack gap={0.5} flex={1} minWidth={0}>
          <Typography
            variant="subtitle2"
            sx={{ fontSize: 12, fontWeight: 600, letterSpacing: 0.3, color: "text.primary" }}
          >
            Title
          </Typography>
          <TextField
            value={question.text}
            onChange={(e) => setField("text", e.target.value)}
            fullWidth
            required
            multiline
            minRows={2}
            placeholder="Enter question text"
          />
        </Stack>
        {logicButton && <Stack pt={3}>{logicButton}</Stack>}
      </Stack>

      {/* Question type label row */}
      <Stack gap={0.5}>
        <Typography
          variant="subtitle2"
          sx={{ fontSize: 12, fontWeight: 600, letterSpacing: 0.3, color: "text.primary" }}
        >
          Question type
        </Typography>
        <Stack direction="row" gap={2} alignItems="center" flexWrap="wrap">
          <FormControl>
            <Select
              value={question.type}
              onChange={(e) => handleTypeChange(e.target.value as QuestionType)}
              sx={{ minWidth: 180 }}
            >
              {(Object.keys(TYPE_LABELS) as QuestionType[]).map((t) => (
                <MenuItem key={t} value={t}>
                  {TYPE_LABELS[t]}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <FormControlLabel
            control={
              <Checkbox
                checked={question.required}
                onChange={(e) => setField("required", e.target.checked)}
              />
            }
            label="Required"
          />
        </Stack>
      </Stack>

      {hasOptions && (
        <Stack gap={1}>
          <Typography
            variant="subtitle2"
            sx={{ fontSize: 12, fontWeight: 600, letterSpacing: 0.3, color: "text.primary" }}
          >
            Options
          </Typography>
          {(question.options ?? []).map((opt, i) => (
            <Stack key={i} direction="row" gap={1} alignItems="center">
              <TextField
                size="small"
                value={opt}
                onChange={(e) => handleOptionChange(i, e.target.value)}
                placeholder={`Option ${i + 1}`}
                fullWidth
              />
              <Tooltip title="Remove option">
                <span>
                  <IconButton
                    size="small"
                    onClick={() => removeOption(i)}
                    disabled={(question.options?.length ?? 0) <= 1}
                  >
                    <TrashIcon />
                  </IconButton>
                </span>
              </Tooltip>
            </Stack>
          ))}
          <Button
            variant="text"
            size="small"
            startIcon={<AddIcon />}
            onClick={addOption}
            sx={{ alignSelf: "flex-start" }}
          >
            Add Option
          </Button>
        </Stack>
      )}

      {logicPanel}

      {/* Footer: question number + move/delete actions */}
      <Divider />
      <Stack direction="row" alignItems="center" justifyContent="space-between">
        <Typography variant="subtitle2" color="text.secondary">
          Question {index + 1}
        </Typography>
        <Stack direction="row" gap={0.5}>
          <Tooltip title="Move up">
            <span>
              <IconButton size="small" onClick={onMoveUp} disabled={index === 0}>
                <ArrowUpIcon />
              </IconButton>
            </span>
          </Tooltip>
          <Tooltip title="Move down">
            <span>
              <IconButton size="small" onClick={onMoveDown} disabled={index === total - 1}>
                <ArrowDownIcon />
              </IconButton>
            </span>
          </Tooltip>
          <Tooltip title="Delete question">
            <IconButton size="small" onClick={onDelete} sx={{ color: "error.main" }}>
              <TrashIcon />
            </IconButton>
          </Tooltip>
        </Stack>
      </Stack>
    </Stack>
  );
}
