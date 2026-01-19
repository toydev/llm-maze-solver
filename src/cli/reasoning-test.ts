import { program } from 'commander';
import { Ollama } from 'ollama';

import { MOVES } from '@/execution/execution';
import { Maze } from '@/maze/maze';
import { Strategies } from '@/prompt/strategies';

const MoveSchema = {
  type: 'object',
  properties: { move: { type: 'string', enum: MOVES } },
  required: ['move'],
} as const;

program
  .name('reasoning-test')
  .requiredOption('-z, --maze <file>', 'Maze file (e.g., 5x5_corridor_straight)')
  .requiredOption('-s, --strategy <name>', 'Strategy name (e.g., list)')
  .requiredOption('-p, --position <x,y>', 'Current position (e.g., 1,1)')
  .option('-m, --model <name>', 'Model name', 'gpt-oss:20b')
  .option('-t, --think <value>', 'Think setting (true/false/low/medium/high)', 'true')
  .option('-H, --history', 'Include visit history')
  .parse();

const opts = program.opts();

type ThinkValue = boolean | 'low' | 'medium' | 'high';

function parseThink(value: string): ThinkValue {
  if (value === 'true') return true;
  if (value === 'false') return false;
  return value as 'low' | 'medium' | 'high';
}

async function main() {
  const ollama = new Ollama();
  const maze = await Maze.fromFile(`mazes/${opts.maze}.txt`);
  const strategy = Strategies.find(opts.strategy)[opts.strategy];
  const [x, y] = opts.position.split(',').map(Number);
  const position = { x, y };
  const history = opts.history ? maze.getPathFromStart(position) : null;

  const prompt = strategy.buildPrompt(maze, position, history);

  console.log('=== Conditions ===');
  console.log(`Model: ${opts.model}`);
  console.log(`Maze: ${opts.maze}`);
  console.log(`Strategy: ${opts.strategy}`);
  console.log(`Position: (${x},${y})`);
  console.log(`History: ${opts.history ? 'yes' : 'no'}`);
  console.log(`Think: ${opts.think}`);
  console.log('');

  console.log('=== Prompt ===');
  console.log(prompt);
  console.log('');

  const thinkValue = parseThink(opts.think);
  console.log('=== Running... ===');
  const response = await ollama.chat({
    model: opts.model,
    messages: [{ role: 'user', content: prompt }],
    think: thinkValue,
    format: MoveSchema,
    stream: false,
  });

  console.log('');
  console.log('=== thinking ===');
  console.log(response.message.thinking);
  console.log('');
  console.log('=== content ===');
  console.log(response.message.content);
}

main();
