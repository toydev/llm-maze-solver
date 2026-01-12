## Model Comparison: gemma3 vs gpt-oss:20b

| model | accuracy_mean | timePerCell_mean |
| --- | --- | --- |
| gpt-oss:20b | 96.6 | 38.6 |

## Strategy Comparison

| strategy | accuracy_mean | timePerCell_mean |
| --- | --- | --- |
| graph | 97.6 | 25.7 |
| list | 96.1 | 24.3 |
| matrix | 95.3 | 42.0 |
| simple | 97.2 | 62.3 |

## History Comparison

| history | accuracy_mean | timePerCell_mean |
| --- | --- | --- |
| no | 97.8 | 39.3 |
| yes | 95.0 | 37.7 |

## Category Comparison (corridor / open)

| category | accuracy_mean | timePerCell_mean |
| --- | --- | --- |
| corridor | 95.6 | 45.1 |
| open | 97.9 | 29.1 |

## Maze Type Comparison

| mazeType | accuracy_mean | timePerCell_mean |
| --- | --- | --- |
| corridor_branch | 92.6 | 38.3 |
| corridor_dead-end | 94.5 | 60.2 |
| corridor_loop | 88.2 | 47.4 |
| corridor_spiral | 97.6 | 64.9 |
| corridor_straight | 99.4 | 33.0 |
| open_detour | 94.4 | 54.2 |
| open_empty | 99.4 | 18.5 |
| open_pass | 97.9 | 30.6 |
