import React from "react";
import { Text } from "ink";

interface Segment {
  text: string;
  bold?: boolean;
  italic?: boolean;
  code?: boolean;
  heading?: boolean;
  bullet?: boolean;
}

/**
 * Parse a single line of markdown into styled segments.
 */
function parseInline(line: string): Segment[] {
  const segments: Segment[] = [];
  // Regex matches: `code`, **bold**, *italic* (in that priority order)
  const regex = /(`[^`]+`)|(\*\*[^*]+\*\*)|(\*[^*]+\*)/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(line)) !== null) {
    // Push plain text before this match
    if (match.index > lastIndex) {
      segments.push({ text: line.slice(lastIndex, match.index) });
    }

    if (match[1]) {
      // Inline code: `text`
      segments.push({ text: match[1].slice(1, -1), code: true });
    } else if (match[2]) {
      // Bold: **text**
      segments.push({ text: match[2].slice(2, -2), bold: true });
    } else if (match[3]) {
      // Italic: *text*
      segments.push({ text: match[3].slice(1, -1), italic: true });
    }

    lastIndex = match.index + match[0].length;
  }

  // Remaining plain text
  if (lastIndex < line.length) {
    segments.push({ text: line.slice(lastIndex) });
  }

  return segments;
}

/**
 * Render inline segments as Ink <Text> elements.
 */
function renderSegments(segments: Segment[]): React.ReactNode[] {
  return segments.map((seg, i) => {
    if (seg.code) {
      return (
        <Text key={i} color="yellow" backgroundColor="gray">
          {` ${seg.text} `}
        </Text>
      );
    }
    if (seg.bold) {
      return (
        <Text key={i} bold>
          {seg.text}
        </Text>
      );
    }
    if (seg.italic) {
      return (
        <Text key={i} italic>
          {seg.text}
        </Text>
      );
    }
    return <Text key={i}>{seg.text}</Text>;
  });
}

interface MarkdownTextProps {
  children: string;
}

/**
 * Simple Markdown renderer for Ink TUI.
 * Supports: headings (## ), bold (**), italic (*), inline code (`),
 * bullet lists (- ), and code blocks (```).
 */
export function MarkdownText({ children }: MarkdownTextProps) {
  const lines = children.split("\n");
  const elements: React.ReactNode[] = [];
  let inCodeBlock = false;
  let codeBlockLines: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Code block toggle
    if (line.trimStart().startsWith("```")) {
      if (inCodeBlock) {
        // End code block
        elements.push(
          <Text key={`cb-${i}`} color="yellow">
            {codeBlockLines.join("\n")}
          </Text>,
        );
        codeBlockLines = [];
        inCodeBlock = false;
      } else {
        inCodeBlock = true;
      }
      continue;
    }

    if (inCodeBlock) {
      codeBlockLines.push(line);
      continue;
    }

    // Empty line
    if (line.trim() === "") {
      elements.push(<Text key={`empty-${i}`}> </Text>);
      continue;
    }

    // Heading (## Text)
    const headingMatch = line.match(/^(#{1,3})\s+(.+)$/);
    if (headingMatch) {
      elements.push(
        <Text key={`h-${i}`} bold color="cyan">
          {headingMatch[2]}
        </Text>,
      );
      continue;
    }

    // Bullet list (- item or * item)
    const bulletMatch = line.match(/^(\s*[-*])\s+(.+)$/);
    if (bulletMatch) {
      const indent = bulletMatch[1].replace(/[-*]$/, "");
      const segments = parseInline(bulletMatch[2]);
      elements.push(
        <Text key={`li-${i}`} wrap="wrap">
          {indent} • {renderSegments(segments)}
        </Text>,
      );
      continue;
    }

    // Numbered list (1. item)
    const numberedMatch = line.match(/^(\s*)(\d+)\.\s+(.+)$/);
    if (numberedMatch) {
      const indent = numberedMatch[1];
      const num = numberedMatch[2];
      const segments = parseInline(numberedMatch[3]);
      elements.push(
        <Text key={`ol-${i}`} wrap="wrap">
          {indent}
          {num}. {renderSegments(segments)}
        </Text>,
      );
      continue;
    }

    // Regular paragraph
    const segments = parseInline(line);
    elements.push(
      <Text key={`p-${i}`} wrap="wrap">
        {renderSegments(segments)}
      </Text>,
    );
  }

  // Unclosed code block
  if (inCodeBlock && codeBlockLines.length > 0) {
    elements.push(
      <Text key="cb-end" color="yellow">
        {codeBlockLines.join("\n")}
      </Text>,
    );
  }

  return <>{elements}</>;
}
