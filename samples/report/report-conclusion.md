## deepseek-r1:14b vs gpt-oss:20b（5x5, 7x7）

| model | strategy | size | accuracy_mean | timePerCell_mean |
| --- | --- | --- | --- | --- |
| deepseek-r1:14b | graph | 5 | 100.0 | 38.3 |
| deepseek-r1:14b | graph | 7 | 84.3 | 34.0 |
| deepseek-r1:14b | list | 5 | 100.0 | 28.5 |
| deepseek-r1:14b | list | 7 | 87.5 | 33.3 |
| deepseek-r1:14b | matrix | 5 | 88.5 | 52.5 |
| deepseek-r1:14b | matrix | 7 | 71.5 | 75.8 |
| deepseek-r1:14b | simple | 5 | 100.0 | 74.8 |
| deepseek-r1:14b | simple | 7 | 74.1 | 110.9 |
| gpt-oss:20b | graph | 5 | 100.0 | 13.0 |
| gpt-oss:20b | graph | 7 | 96.7 | 30.4 |
| gpt-oss:20b | list | 5 | 100.0 | 12.3 |
| gpt-oss:20b | list | 7 | 94.7 | 28.8 |
| gpt-oss:20b | matrix | 5 | 97.9 | 21.3 |
| gpt-oss:20b | matrix | 7 | 94.4 | 49.8 |
| gpt-oss:20b | simple | 5 | 100.0 | 31.8 |
| gpt-oss:20b | simple | 7 | 96.2 | 73.8 |

## gemma3:12b vs gpt-oss:20b（11x11）

| model | strategy | accuracy_mean | timePerCell_mean |
| --- | --- | --- | --- |
| gemma3:12b | graph | 42.8 | 1.2 |
| gemma3:12b | list | 52.6 | 0.5 |
| gemma3:12b | matrix | 38.6 | 0.5 |
| gemma3:12b | simple | 47.6 | 0.5 |
| gpt-oss:20b | graph | 85.3 | 176.8 |
| gpt-oss:20b | list | 89.9 | 116.3 |
| gpt-oss:20b | matrix | 96.0 | 70.3 |
| gpt-oss:20b | simple | 86.5 | 265.1 |
