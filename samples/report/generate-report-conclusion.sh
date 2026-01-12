#!/bin/bash
cd "$(dirname "$0")"
CSV=stats.csv
OUT=report-conclusion.md
FMT='$accuracy_mean = fmtnum($accuracy_mean, "%.1f"); $timePerCell_mean = fmtnum($timePerCell_mean, "%.1f")'

{
  echo "## deepseek-r1:14b vs gpt-oss:20b（5x5, 7x7）"
  echo ""
  mlr --csv filter '($model == "deepseek-r1:14b" || $model == "gpt-oss:20b") && ($size == 5 || $size == 7)' then stats1 -a mean -f accuracy,timePerCell -g model,strategy,size then sort -f model,strategy -nf size then put "$FMT" $CSV | mlr --icsv --omd cat

  echo ""
  echo "## gemma3:12b vs gpt-oss:20b（11x11）"
  echo ""
  mlr --csv filter '($model == "gemma3:12b" || $model == "gpt-oss:20b") && $size == 11' then stats1 -a mean -f accuracy,timePerCell -g model,strategy then sort -f model,strategy then put "$FMT" $CSV | mlr --icsv --omd cat
} > $OUT

echo "Generated: $OUT"
