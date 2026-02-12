import React from "react";
import { Box, Text } from "ink";

interface HeaderProps {
  cluster: string;
  namespace: string;
  context: string;
}

export function Header({ cluster, namespace, context }: HeaderProps) {
  return (
    <Box
      borderStyle="single"
      borderColor="cyan"
      paddingX={1}
      justifyContent="center"
    >
      <Text bold color="cyan">
        🔗 cluster: {cluster}
      </Text>
      <Text color="gray"> │ </Text>
      <Text bold color="cyan">
        ns: {namespace}
      </Text>
      <Text color="gray"> │ </Text>
      <Text bold color="cyan">
        ctx: {context}
      </Text>
    </Box>
  );
}
