import React from "react";
import { Box, Text } from "ink";
import { MarkdownText } from "./MarkdownText.js";

// --- Timeline entry types ---

export interface ChatEntry {
  type: "chat";
  role: "user" | "assistant";
  content: string;
}

export interface ToolEntry {
  type: "tool";
  toolName: string;
  output?: string;
  status: "running" | "complete";
}

export type TimelineEntry = ChatEntry | ToolEntry;

// --- Collapsible tool output ---

const MAX_OUTPUT_CHARS = 500;

function ToolOutputBox({ output }: { output: string }) {
  const isLong = output.length > MAX_OUTPUT_CHARS;
  const preview = isLong ? output.slice(0, MAX_OUTPUT_CHARS) : output;
  const remaining = output.length - MAX_OUTPUT_CHARS;

  return (
    <Box
      flexDirection="column"
      borderStyle="single"
      borderColor="gray"
      paddingX={1}
    >
      <Text wrap="wrap" dimColor>
        {preview}
      </Text>
      {isLong && (
        <Text color="gray" italic>
          … +{remaining} chars truncated
        </Text>
      )}
    </Box>
  );
}

// --- Individual entry renderers ---

function ChatEntryView({ entry }: { entry: ChatEntry }) {
  const isUser = entry.role === "user";
  return (
    <Box flexDirection="column" marginBottom={1}>
      <Text bold color={isUser ? "green" : "magenta"}>
        {isUser ? "💬 You:" : "🤖 Copilot:"}
      </Text>
      {isUser ? (
        <Text wrap="wrap"> {entry.content}</Text>
      ) : (
        <MarkdownText>{entry.content}</MarkdownText>
      )}
    </Box>
  );
}

function ToolEntryView({ entry }: { entry: ToolEntry }) {
  const icon = entry.status === "running" ? "⏳" : "✅";
  return (
    <Box flexDirection="column" marginBottom={1}>
      <Text>
        {icon} <Text color="yellow">{entry.toolName}</Text>
        {entry.status === "running" && <Text color="gray"> running…</Text>}
      </Text>
      {entry.output && <ToolOutputBox output={entry.output} />}
    </Box>
  );
}

// --- Main Timeline component ---

interface TimelineProps {
  entries: TimelineEntry[];
}

export function Timeline({ entries }: TimelineProps) {
  return (
    <Box flexDirection="column" paddingX={1} flexGrow={1}>
      {entries.map((entry, i) =>
        entry.type === "chat" ? (
          <ChatEntryView key={i} entry={entry} />
        ) : (
          <ToolEntryView key={i} entry={entry} />
        ),
      )}
    </Box>
  );
}
