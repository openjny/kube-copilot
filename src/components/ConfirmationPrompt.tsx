import React from "react";
import { Box, Text, useInput } from "ink";
import { useConfirmation } from "../context/confirmation.js";

export function ConfirmationPrompt() {
  const { pending, respond } = useConfirmation();

  useInput(
    (input) => {
      if (!pending) return;
      const key = input.toLowerCase();
      if (key === "y") {
        respond(true);
      } else if (key === "n") {
        respond(false);
      }
    },
    { isActive: !!pending }
  );

  if (!pending) return null;

  return (
    <Box
      flexDirection="column"
      borderStyle="round"
      borderColor={pending.isDestructive ? "red" : "yellow"}
      paddingX={1}
      marginY={1}
    >
      {pending.isDestructive && (
        <Text color="red" bold>
          ⚠️  DESTRUCTIVE OPERATION — requires explicit confirmation
        </Text>
      )}
      <Text>
        📎 Command: <Text color="yellow">{pending.command}</Text>
      </Text>
      <Text>
        {pending.isDestructive
          ? "Type Y to confirm this destructive operation, N to cancel: "
          : "Execute this command? (Y/N): "}
      </Text>
    </Box>
  );
}
