import React, { useState } from "react";
import { Box, Text } from "ink";
import TextInput from "ink-text-input";

interface InputBarProps {
  onSubmit: (value: string) => void;
  isDisabled?: boolean;
}

export function InputBar({ onSubmit, isDisabled = false }: InputBarProps) {
  const [value, setValue] = useState("");

  const handleSubmit = (text: string) => {
    if (text.trim() && !isDisabled) {
      onSubmit(text.trim());
      setValue("");
    }
  };

  return (
    <Box borderStyle="single" borderColor="green" paddingX={1}>
      <Text color="green">&gt; </Text>
      <TextInput
        value={value}
        onChange={setValue}
        onSubmit={handleSubmit}
        placeholder={
          isDisabled ? "Waiting for response..." : "Ask about your cluster..."
        }
      />
    </Box>
  );
}
