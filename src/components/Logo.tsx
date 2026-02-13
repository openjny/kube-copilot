import React from "react";
import { Box, Text } from "ink";

const LOGO = `
 ██╗  ██╗██╗   ██╗██████╗ ███████╗
 ██║ ██╔╝██║   ██║██╔══██╗██╔════╝
 █████╔╝ ██║   ██║██████╔╝█████╗  
 ██╔═██╗ ██║   ██║██╔══██╗██╔══╝  
 ██║  ██╗╚██████╔╝██████╔╝███████╗
 ╚═╝  ╚═╝ ╚═════╝ ╚═════╝ ╚══════╝
          ██████╗ ██████╗ ██████╗ ██╗██╗      ██████╗ ████████╗
         ██╔════╝██╔═══██╗██╔══██╗██║██║     ██╔═══██╗╚══██╔══╝
         ██║     ██║   ██║██████╔╝██║██║     ██║   ██║   ██║   
         ██║     ██║   ██║██╔═══╝ ██║██║     ██║   ██║   ██║   
         ╚██████╗╚██████╔╝██║     ██║███████╗╚██████╔╝   ██║   
          ╚═════╝ ╚═════╝ ╚═╝     ╚═╝╚══════╝ ╚═════╝    ╚═╝   
`.trimEnd();

const TAGLINE = "Natural Language Kubernetes Operations";

export function Logo() {
  return (
    <Box
      flexDirection="column"
      alignItems="center"
      justifyContent="center"
      width="100%"
      paddingY={1}
    >
      <Text color="cyan">{LOGO}</Text>
      <Box marginTop={1}>
        <Text color="gray" italic>
          {TAGLINE}
        </Text>
      </Box>
      <Box marginTop={1}>
        <Text color="yellow" dimColor>
          ⎈ Powered by GitHub Copilot
        </Text>
      </Box>
    </Box>
  );
}
