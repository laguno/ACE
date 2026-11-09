// Hook SessionStart: avvisa se ACE è aperta con l'account aziendale (~/.claude) invece che con
// il personale (claude-personal, che imposta CLAUDE_CONFIG_DIR su %USERPROFILE%\.claude-personal).
// Solo su Windows; non blocca niente.
if (process.platform === 'win32') {
  const dir = (process.env.CLAUDE_CONFIG_DIR ?? '').replace(/[\\/]+$/, '');
  if (!dir.endsWith('.claude-personal')) {
    process.stdout.write(
      JSON.stringify({ systemMessage: "Attenzione: ACE è aperta con l'account aziendale. Per il personale chiudi e riapri con claude-personal." }),
    );
  }
}
