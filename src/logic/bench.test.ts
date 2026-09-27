import { it } from 'vitest';
import { bench, setWorlds } from './bench';
it.skipIf(!process.env.BENCH)('bench', () => {
  const n = Number(process.env.BENCH_N ?? 300);
  setWorlds(Number(process.env.WORLDS ?? 24));
  const pairs = (process.env.PAIRS ?? 'beginner:beginner,beginner:expert,beginner:tajja,tajja:beginner').split(',');
  const t0 = performance.now();
  const rows = pairs.map((p) => {
    const [a, b] = p.split(':') as [never, never];
    return bench(a, b, n);
  });
  process.stdout.write('BENCH ' + JSON.stringify(rows) + ' ms=' + Math.round(performance.now() - t0) + '\n');
}, 3600000);
