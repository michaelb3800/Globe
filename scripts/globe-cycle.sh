#!/bin/bash
# Globe Protocol - 5-minute autonomous cycle check
# Checks Discord, GitHub state, and reports

cd /Users/michaelbernard/.openclaw/workspace

# Log output
LOGFILE="/Users/michaelbernard/.openclaw/workspace/logs/globe-cron.log"
mkdir -p "$(dirname $LOGFILE)"

echo "=== $(date) ===" >> $LOGFILE

# Check git status
echo "Git status:" >> $LOGFILE
git status --short >> $LOGFILE 2>&1

# Check if there are new commits
echo "Recent commits:" >> $LOGFILE
git log --oneline -3 >> $LOGFILE 2>&1

# Check contracts tests
echo "Contract tests:" >> $LOGFILE
cd contracts
export PATH="$HOME/.foundry/bin:$PATH"
forge test >> $LOGFILE 2>&1 || echo "Tests failed" >> $LOGFILE

echo "---" >> $LOGFILE
