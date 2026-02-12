import React from "react";
import { Box, Text } from "ink";

interface CommandDisplayProps {
  command: string | null;
}

export function CommandDisplay({ command }: CommandDisplayProps) {
  if (!command) return null;

  return (
    <Box paddingX={1} marginBottom={1}>
      <Text>
        📎 Run: <Text color="yellow">{command}</Text>
      </Text>
    </Box>
  );
}
