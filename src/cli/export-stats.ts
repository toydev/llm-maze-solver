import fs from 'fs/promises';
import path from 'path';

import { program } from 'commander';

import { DEFAULT_OUTPUT_DIR, Executions, type Execution } from '@/execution/execution';

const MAZES_DIR = './mazes';

type MazeInfo = {
  totalCells: number;
  passableCells: number;
  edges: number;
};

type CsvRecord = {
  model: string;
  maze: string;
  size: number;
  category: string;
  mazeType: string;
  strategy: string;
  history: string;
  total: number;
  correct: number;
  wrong: number;
  exceptions: number;
  accuracy: number;
  wrongRate: number;
  exceptionRate: number;
  timePerCell: number;
  passableCells: number;
  edges: number;
};

program
  .name('export-stats')
  .description('Export execution data as CSV for pivot analysis')
  .option('-o, --output <dir>', 'Output directory', DEFAULT_OUTPUT_DIR)
  .option('-m, --model <model>', 'Filter by model name (partial match)')
  .action(async (options) => {
    const executions = await Executions.find({ model: options.model }, options.output);
    if (executions.length === 0) {
      console.error('No executions found.');
      return;
    }

    const mazeNames = new Set<string>();
    for (const exec of executions) {
      mazeNames.add(path.basename(exec.mazeFile, '.txt'));
    }

    const mazeInfoMap = await loadAllMazeInfo(Array.from(mazeNames));
    const records = aggregateData(executions, mazeInfoMap);
    outputCsv(records);
  });

program.parse();

async function loadAllMazeInfo(mazeNames: string[]): Promise<Map<string, MazeInfo>> {
  const infoMap = new Map<string, MazeInfo>();
  for (const name of mazeNames) {
    try {
      const info = await loadMazeInfo(name);
      infoMap.set(name, info);
    } catch {
      // skip
    }
  }
  return infoMap;
}

async function loadMazeInfo(mazeName: string): Promise<MazeInfo> {
  const filePath = path.join(MAZES_DIR, `${mazeName}.txt`);
  const content = await fs.readFile(filePath, 'utf-8');
  const lines = content.split('\n').filter((line) => line.length > 0);

  const height = lines.length;
  const width = lines[0]?.length ?? 0;
  const totalCells = width * height;

  const walkable = new Set<string>();
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const char = lines[y][x];
      if (char !== '#') {
        walkable.add(`${x},${y}`);
      }
    }
  }

  const passableCells = walkable.size;

  let edgeCount = 0;
  for (const pos of walkable) {
    const [x, y] = pos.split(',').map(Number);
    if (walkable.has(`${x + 1},${y}`)) edgeCount++;
    if (walkable.has(`${x},${y + 1}`)) edgeCount++;
  }

  return {
    totalCells,
    passableCells,
    edges: edgeCount,
  };
}

function aggregateData(executions: Execution[], mazeInfoMap: Map<string, MazeInfo>): CsvRecord[] {
  const grouped = new Map<string, { total: number; correct: number; wrong: number; exceptions: number; timeMs: number }>();

  for (const exec of executions) {
    const mazeName = path.basename(exec.mazeFile, '.txt');
    const key = `${exec.modelName}|${mazeName}|${exec.strategyName}|${exec.includeHistory}`;

    if (!grouped.has(key)) {
      grouped.set(key, { total: 0, correct: 0, wrong: 0, exceptions: 0, timeMs: 0 });
    }
    const stats = grouped.get(key)!;

    for (const cell of exec.cellResults) {
      stats.total++;
      if (cell.isCorrect) {
        stats.correct++;
      } else {
        stats.wrong++;
        if (cell.llmMove === null) {
          stats.exceptions++;
        }
      }
      if (cell.timeMs) stats.timeMs += cell.timeMs;
    }
  }

  const records: CsvRecord[] = [];
  for (const [key, stats] of grouped) {
    const [model, maze, strategy, historyStr] = key.split('|');
    const { size, mazeType, category } = parseMazeName(maze);
    const mazeInfo = mazeInfoMap.get(maze) ?? { totalCells: size * size, passableCells: 0, edges: 0 };

    const wrongRate = stats.total > 0 ? Math.round((stats.wrong / stats.total) * 1000) / 10 : 0;
    const exceptionRate = stats.total > 0 ? Math.round((stats.exceptions / stats.total) * 1000) / 10 : 0;
    const accuracy = stats.total > 0 ? Math.round((100 - wrongRate) * 10) / 10 : 0;

    records.push({
      model,
      maze,
      size,
      category,
      mazeType,
      strategy,
      history: historyStr === 'true' ? 'yes' : 'no',
      total: stats.total,
      correct: stats.correct,
      wrong: stats.wrong,
      exceptions: stats.exceptions,
      accuracy,
      wrongRate,
      exceptionRate,
      timePerCell: stats.total > 0 ? Math.round((stats.timeMs / stats.total / 1000) * 100) / 100 : 0,
      passableCells: mazeInfo.passableCells,
      edges: mazeInfo.edges,
    });
  }

  records.sort((a, b) => {
    if (a.model !== b.model) return a.model.localeCompare(b.model);
    if (a.maze !== b.maze) return a.maze.localeCompare(b.maze);
    if (a.strategy !== b.strategy) return a.strategy.localeCompare(b.strategy);
    return a.history.localeCompare(b.history);
  });

  return records;
}

function parseMazeName(maze: string): { size: number; mazeType: string; category: string } {
  const match = maze.match(/^(\d+)x\d+_(.+)$/);
  if (!match) {
    return { size: 0, mazeType: maze, category: 'unknown' };
  }
  const size = parseInt(match[1], 10);
  const mazeType = match[2];
  const category = mazeType.startsWith('open') ? 'open' : 'corridor';
  return { size, mazeType, category };
}

function outputCsv(records: CsvRecord[]): void {
  const headers = [
    'model',
    'maze',
    'size',
    'category',
    'mazeType',
    'strategy',
    'history',
    'total',
    'correct',
    'wrong',
    'exceptions',
    'accuracy',
    'wrongRate',
    'exceptionRate',
    'timePerCell',
    'passableCells',
    'edges',
  ];
  console.log(headers.join(','));

  for (const r of records) {
    const row = [
      r.model,
      r.maze,
      r.size,
      r.category,
      r.mazeType,
      r.strategy,
      r.history,
      r.total,
      r.correct,
      r.wrong,
      r.exceptions,
      r.accuracy,
      r.wrongRate,
      r.exceptionRate,
      r.timePerCell,
      r.passableCells,
      r.edges,
    ];
    console.log(row.join(','));
  }
}
