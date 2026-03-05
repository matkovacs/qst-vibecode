import {
  Checkbox,
  FormControl,
  FormControlLabel,
  FormGroup,
  FormLabel,
  Radio,
  RadioGroup,
  TextField,
} from "@mui/material";
import type { Question, AnswerValue } from "../types.js";

interface Props {
  question: Question;
  value: AnswerValue;
  onChange: (value: AnswerValue) => void;
}

export default function QuestionInput({ question, value, onChange }: Props) {
  if (question.type === "text") {
    return (
      <TextField
        label={question.text}
        value={(value as string) ?? ""}
        onChange={(e) => onChange(e.target.value)}
        required={question.required}
        fullWidth
        multiline
        minRows={2}
      />
    );
  }

  if (question.type === "single-select") {
    return (
      <FormControl required={question.required} component="fieldset">
        <FormLabel component="legend">{question.text}</FormLabel>
        <RadioGroup
          value={(value as string) ?? ""}
          onChange={(e) => onChange(e.target.value)}
        >
          {(question.options ?? []).map((opt) => (
            <FormControlLabel key={opt} value={opt} control={<Radio />} label={opt} />
          ))}
        </RadioGroup>
      </FormControl>
    );
  }

  if (question.type === "multiple-choice") {
    const selected = (value as string[]) ?? [];

    function toggle(opt: string) {
      if (selected.includes(opt)) {
        onChange(selected.filter((s) => s !== opt));
      } else {
        onChange([...selected, opt]);
      }
    }

    return (
      <FormControl required={question.required} component="fieldset">
        <FormLabel component="legend">{question.text}</FormLabel>
        <FormGroup>
          {(question.options ?? []).map((opt) => (
            <FormControlLabel
              key={opt}
              control={
                <Checkbox checked={selected.includes(opt)} onChange={() => toggle(opt)} />
              }
              label={opt}
            />
          ))}
        </FormGroup>
      </FormControl>
    );
  }

  return null;
}
