#!/bin/bash
cd "$(dirname "$0")"
CSV=stats.csv
OUT=report-results-pre.md
FMT='$accuracy_mean = fmtnum($accuracy_mean, "%.1f"); $timePerCell_mean = fmtnum($timePerCell_mean, "%.1f")'
FILTER_GPT='$model == "gpt-oss:20b" && ($size == 5 || $size == 7)'

{
  echo "## Model Comparison: gemma3 vs gpt-oss:20b"
  echo ""
  mlr --csv filter '($size == 5 || $size == 7) && ($model == "gemma3" || $model == "gpt-oss:20b")' then stats1 -a mean -f accuracy,timePerCell -g model then sort -f model then put "$FMT" $CSV | mlr --icsv --omd cat

  echo ""
  echo "## Strategy Comparison"
  echo ""
  mlr --csv filter "$FILTER_GPT" then stats1 -a mean -f accuracy,timePerCell -g strategy then sort -f strategy then put "$FMT" $CSV | mlr --icsv --omd cat

  echo ""
  echo "## History Comparison"
  echo ""
  mlr --csv filter "$FILTER_GPT" then stats1 -a mean -f accuracy,timePerCell -g history then sort -f history then put "$FMT" $CSV | mlr --icsv --omd cat

  echo ""
  echo "## Category Comparison (corridor / open)"
  echo ""
  mlr --csv filter "$FILTER_GPT" then stats1 -a mean -f accuracy,timePerCell -g category then sort -f category then put "$FMT" $CSV | mlr --icsv --omd cat

  echo ""
  echo "## Maze Type Comparison"
  echo ""
  mlr --csv filter "$FILTER_GPT" then stats1 -a mean -f accuracy,timePerCell -g mazeType then sort -f mazeType then put "$FMT" $CSV | mlr --icsv --omd cat
} > $OUT

echo "Generated: $OUT"
