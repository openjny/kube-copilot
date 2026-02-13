import React from "react";
import { Box, Text } from "ink";

export interface ToolExecution {
  toolName: string;
  output?: string;
  status: "running" | "complete";
}

interface ToolExecutionListProps {
  executions: ToolExecution[];
}

const MAX_OUTPUT_LINES = 20;

function truncateOutput(output: string): string {
  const lines = output.split("\n");
  if (lines.length <= MAX_OUTPUT_LINES) return output;
  return (
    lines.slice(0, MAX_OUTPUT_LINES).join("\n") +
    `\n... (${lines.length - MAX_OUTPUT_LINES} more lines)`
  );
}

export function ToolExecutionList({ executions }: ToolExecutionListProps) {
  if (executions.length === 0) return null;

  return (
    <Box flexDirection="column" paddingX={1}>
      {executions.map((exec, i) => (
        <Box key={i} flexDirection="column" marginBottom={1}>
          <Text>
            {exec.status === "running" ? "⏳" : "✅"}{" "}
            <Text color="yellow">{exec.toolName}</Text>
          </Text>
          {exec.output && (
            <Box
              flexDirection="column"
              borderStyle="single"
              borderColor="gray"
              paddingX={1}
              marginTop={0}
            >
              <Text wrap="wrap">{truncateOutput(exec.output)}</Text>
            </Box>
          )}
        </Box>
      ))}
    </Box>
  );
}
