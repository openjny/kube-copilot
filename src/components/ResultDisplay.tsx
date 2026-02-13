import React from "react";
import { Box, Text } from "ink";

interface ResultDisplayProps {
  output: string | null;
}

export function ResultDisplay({ output }: ResultDisplayProps) {
  if (!output) return null;

  return (
    <Box
      flexDirection="column"
      borderStyle="single"
      borderColor="gray"
      paddingX={1}
      marginBottom={1}
    >
      <Text wrap="wrap">{output}</Text>
    </Box>
  );
}
