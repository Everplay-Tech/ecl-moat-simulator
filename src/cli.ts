import readline from 'readline';
import { ECLModel } from './ecl-core.js';

const model = new ECLModel();
const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    prompt: 'ECL> '
});

console.log('\x1b[34m%s\x1b[0m', '--- ECL: Algorithmic Moat Simulator (CLI) ---');
console.log('Type "help" for a list of commands.\n');

rl.prompt();

rl.on('line', (line) => {
    const [command, ...args] = line.trim().toLowerCase().split(/\s+/);

    switch (command) {
        case 'help':
            console.log('\nAvailable Commands:');
            console.log('  scar      - Execute a usage event (add a scar to the manifold)');
            console.log('  metrics   - View current mathematical metrics');
            console.log('  probe     - Run a trajectory divergence test');
            console.log('  state     - Dump full model state (JSON)');
            console.log('  reset     - Restore manifold to full plasticity');
            console.log('  exit      - Close the simulator\n');
            break;

        case 'scar':
            const success = model.executeUsageEvent();
            if (success) {
                console.log(`\x1b[32m[SUCCESS]\x1b[0m Usage event lithified. Rank(Q): ${model.state.rank}`);
            } else {
                console.log(`\x1b[31m[ERROR]\x1b[0m Constraint saturation reached (Rank ${model.state.rank}/10).`);
            }
            break;

        case 'metrics':
            const m = model.getMetrics();
            console.log('\x1b[36m%s\x1b[0m', '\n--- Metrics ---');
            console.log(`Rank:         ${m.rank}`);
            console.log(`Codimension:  ${m.codimension}`);
            console.log(`Volume Decay: ${(m.volume_decay * 100).toFixed(2)}%`);
            console.log('---------------\n');
            break;

        case 'probe':
            const steps = parseInt(args[0]) || 10;
            const res = model.probeDivergence(steps);
            if (!res) {
                console.log('\x1b[33m[WARN]\x1b[0m Add at least one scar before probing divergence.');
            } else {
                console.log('\x1b[35m%s\x1b[0m', `\n--- Trajectory Probe (Steps: ${steps}) ---`);
                res.forEach(r => console.log(` Step ${r.step}: Δ = ${r.divergence.toFixed(4)}`));
                console.log('----------------------------------------\n');
            }
            break;

        case 'state':
            console.log(JSON.stringify(model.state, null, 2));
            break;

        case 'reset':
            model.reset();
            console.log('\x1b[32m[SUCCESS]\x1b[0m Manifold restored.');
            break;

        case 'exit':
        case 'quit':
            rl.close();
            return;

        default:
            if (command) console.log(`Unknown command: ${command}`);
            break;
    }
    rl.prompt();
}).on('close', () => {
    console.log('\nExiting ECL Simulator.');
    process.exit(0);
});
