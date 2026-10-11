import { Button, Group } from "@mantine/core";
import type { ReactNode } from "react";

export interface Suggestion {
  key: string | number;
  label: ReactNode;
  selected: boolean;
  onSelect: () => void;
}

interface SuggestionChipsProps {
  suggestions: Suggestion[];
}

/** A row of compact buttons that fill a form field with a recent value. */
export default function SuggestionChips({ suggestions }: SuggestionChipsProps) {
  if (suggestions.length === 0) return null;
  return (
    <Group gap={4}>
      {suggestions.map((s) => (
        <Button
          key={s.key}
          size="compact-xs"
          variant={s.selected ? "filled" : "light"}
          onClick={s.onSelect}
        >
          {s.label}
        </Button>
      ))}
    </Group>
  );
}
