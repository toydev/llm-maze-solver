import path from 'path';

import { program } from 'commander';
import pc from 'picocolors';
import prettyMs from 'pretty-ms';

import { CellStats, type AccuracyData, type TimingData } from '@/execution/cell-stats';
import { DEFAULT_OUTPUT_DIR, Executions, type Execution } from '@/execution/execution';
import { Maze } from '@/maze/maze';

type ExecutionGroup = {
  stats: CellStats;
  model: string;
  strategy: string;
  includeHistory: boolean;
};

type MazeGroup = {
  mazeFile: string;
  groups: Map<string, ExecutionGroup>;
};

program
  .name('analyze')
  .description('Per-cell analysis with accuracy and timing grids')
  .option('-m, --model <name>', 'Filter by model name')
  .option('-z, --maze <pattern>', 'Filter by maze name')
  .option('-s, --strategy <name>', 'Filter by strategy name')
  .option('-o, --output <dir>', 'Output directory', DEFAULT_OUTPUT_DIR)
  .option('-H, --history', 'Filter by history included')
  .option('-N, --no-history', 'Filter by history excluded')
  .action(async (options) => {
    const includeHistory = options.history === true ? true : options.history === false ? false : undefined;
    const executions = await Executions.find({ model: options.model, maze: options.maze, strategy: options.strategy, includeHistory }, options.output);

    if (executions.length === 0) {
      console.error('No executions found.');
      return;
    }

    printLegend();

    const mazeGroups = groupByMaze(executions);
    for (const mazeGroup of mazeGroups) {
      await renderMazeGroup(mazeGroup);
    }
  });

program.parse();

function groupByMaze(executions: Execution[]): MazeGroup[] {
  const mazeMap = new Map<string, MazeGroup>();

  for (const exec of executions) {
    if (!mazeMap.has(exec.mazeFile)) {
      mazeMap.set(exec.mazeFile, { mazeFile: exec.mazeFile, groups: new Map() });
    }
    const mazeGroup = mazeMap.get(exec.mazeFile)!;

    const key = `${exec.modelName}|${exec.strategyName}|${exec.includeHistory}`;
    if (!mazeGroup.groups.has(key)) {
      mazeGroup.groups.set(key, { stats: new CellStats(), model: exec.modelName, strategy: exec.strategyName, includeHistory: exec.includeHistory });
    }
    mazeGroup.groups.get(key)!.stats.addExecution(exec);
  }

  return Array.from(mazeMap.values()).sort((a, b) => a.mazeFile.localeCompare(b.mazeFile));
}

function printLegend(): void {
  console.log(`\nAccuracy: ${pc.cyan('●')}=100% ${pc.green('9')}=90%+ ${pc.yellow('5-8')}=50%+ ${pc.red('0-4')}<50%`);
  console.log(`Timing:   ${pc.cyan('0')}=fast ${pc.green('1-2')} ${pc.yellow('3-5')} ${pc.red('6-9')}=slow`);
}

async function renderMazeGroup(mazeGroup: MazeGroup): Promise<void> {
  const mazeName = path.basename(mazeGroup.mazeFile, '.txt');
  const maze = await Maze.fromFile(mazeGroup.mazeFile);

  console.log(`\n${pc.bold(`=== ${mazeName} ===`)}`);

  const sortedGroups = Array.from(mazeGroup.groups.values()).sort((a, b) => {
    if (a.model !== b.model) return a.model.localeCompare(b.model);
    if (a.strategy !== b.strategy) return a.strategy.localeCompare(b.strategy);
    return String(a.includeHistory).localeCompare(String(b.includeHistory));
  });

  for (const group of sortedGroups) {
    const history = group.includeHistory ? 'yes' : 'no';
    const trials = group.stats.trialCount;
    console.log(`\n--- ${group.model} / ${group.strategy} / history:${history} (${trials} trials) ---`);
    renderSideBySideGrids(maze.layout, group.stats);
  }
}

function renderSideBySideGrids(layout: string[], stats: CellStats): void {
  const accuracyData = stats.toAccuracyData();
  const timingData = stats.toTimingData();

  const accuracyGrid = buildAccuracyGrid(layout, accuracyData);
  const timingGrid = buildTimingGrid(layout, timingData);

  const gridWidth = layout[0]?.length ?? 0;
  const headerWidth = Math.max(gridWidth, 'Accuracy'.length);
  const padding = ' '.repeat(headerWidth - gridWidth);
  const gap = '    ';

  const timingStats = getTimingStats(timingData);
  const rangeInfo = timingStats ? `(${prettyMs(timingStats.min)} - ${prettyMs(timingStats.max)})` : '';

  console.log(`${'Accuracy'.padEnd(headerWidth)}${gap}Timing ${rangeInfo}`);
  for (let y = 0; y < layout.length; y++) {
    console.log(`${accuracyGrid[y].join('')}${padding}${gap}${timingGrid[y].join('')}`);
  }
}

function buildAccuracyGrid(layout: string[], data: AccuracyData): string[][] {
  const grid = buildBaseGrid(layout);

  for (const [key, stats] of data) {
    if (stats.total > 0) {
      const [x, y] = key.split(',').map(Number);
      const rate = stats.correct / stats.total;
      grid[y][x] = getAccuracyDisplay(rate);
    }
  }

  return grid;
}

function buildTimingGrid(layout: string[], data: TimingData): string[][] {
  const grid = buildBaseGrid(layout);
  const { min, max } = getTimingStats(data) ?? { min: 0, max: 0 };

  for (const [key, time] of data) {
    const [x, y] = key.split(',').map(Number);
    grid[y][x] = getTimingDisplay(time, min, max);
  }

  return grid;
}

function buildBaseGrid(layout: string[]): string[][] {
  return layout.map((row) => row.split('').map((char) => (char === '#' ? pc.gray('·') : char)));
}

function getAccuracyDisplay(rate: number): string {
  if (rate === 1) return pc.cyan('●');
  if (rate >= 0.9) return pc.green('9');
  if (rate >= 0.5) return pc.yellow(Math.floor(rate * 10).toString());
  return pc.red(Math.floor(rate * 10).toString());
}

function getTimingDisplay(ms: number, min: number, max: number): string {
  if (max === min) return pc.yellow('5');
  const normalized = (ms - min) / (max - min);
  const level = Math.floor(normalized * 9);
  const char = level.toString();
  if (level === 0) return pc.cyan(char);
  if (level <= 2) return pc.green(char);
  if (level <= 5) return pc.yellow(char);
  return pc.red(char);
}

function getTimingStats(data: TimingData): { min: number; max: number } | null {
  if (data.size === 0) return null;
  let min = Infinity;
  let max = 0;
  for (const time of data.values()) {
    min = Math.min(min, time);
    max = Math.max(max, time);
  }
  return { min, max };
}
