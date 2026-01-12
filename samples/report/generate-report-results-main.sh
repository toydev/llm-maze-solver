#!/bin/bash
cd "$(dirname "$0")"
CSV=stats.csv
OUT=report-results-main.md
FMT='$accuracy_mean = fmtnum($accuracy_mean, "%.1f"); $timePerCell_mean = fmtnum($timePerCell_mean, "%.1f")'
FILTER_BASE='$model == "gpt-oss:20b" && $history == "yes" && ($mazeType == "corridor_straight" || $mazeType == "open_empty")'

{
  echo "## Strategy x Size (straight / empty, with history)"
  echo ""
  mlr --csv filter "$FILTER_BASE" then stats1 -a mean -f accuracy,timePerCell -g size,strategy then sort -nf size -f strategy then put "$FMT" $CSV | mlr --icsv --omd cat

  echo ""
  echo "## 11x11 list x Maze Type x History"
  echo ""
  mlr --csv filter '$model == "gpt-oss:20b" && $strategy == "list" && $size == 11' then cut -f mazeType,history,accuracy,timePerCell then sort -f mazeType,history $CSV | mlr --icsv --omd cat

  echo ""
  echo "## list x Maze Type x Size (with history)"
  echo ""
  mlr --csv filter '$model == "gpt-oss:20b" && $strategy == "list" && $history == "yes"' then stats1 -a mean -f accuracy,timePerCell -g mazeType,size then sort -f mazeType -nf size then put "$FMT" $CSV | mlr --icsv --omd cat
} > $OUT

echo "Generated: $OUT"
