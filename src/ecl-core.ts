const DIM = 10;

// Math Utilities
export const MathUtils = {
    zeros: (n: number) => new Array(n).fill(0),
    zerosMat: (n: number) => Array.from({length: n}, () => new Array(n).fill(0)),
    randomVec: (n: number) => {
        let v = Array.from({length: n}, () => (Math.random() - 0.5) * 2);
        return MathUtils.normalize(v);
    },
    norm: (v: number[]) => Math.sqrt(v.reduce((s, x) => s + x*x, 0)),
    normalize: (v: number[]) => {
        const n = MathUtils.norm(v);
        return n === 0 ? v : v.map(x => x / n);
    },
    sub: (a: number[], b: number[]) => a.map((x, i) => x - b[i]),
    add: (a: number[], b: number[]) => a.map((x, i) => x + b[i]),
    scale: (v: number[], s: number) => v.map(x => x * s),
    matVecMul: (M: number[][], v: number[]) => M.map(row => row.reduce((sum, val, i) => sum + val * v[i], 0)),
    outer: (u: number[], v: number[]) => u.map(x => v.map(y => x * y)),
    matAdd: (A: number[][], B: number[][]) => A.map((row, i) => row.map((val, j) => val + B[i][j])),
    trace: (A: number[][]) => A.reduce((sum, row, i) => sum + row[i], 0)
};

export interface ECLState {
    theta: number[];
    Q: number[][];
    history: number[][];
    rank: number;
}

export class ECLModel {
    public state: ECLState;

    constructor() {
        this.state = this.initialize();
    }

    private initialize(): ECLState {
        return {
            theta: MathUtils.randomVec(DIM),
            Q: MathUtils.zerosMat(DIM),
            history: [],
            rank: 0,
        };
    }

    public reset() {
        this.state = this.initialize();
    }

    public lithifyConstraint(u: number[]): boolean {
        const Qu = MathUtils.matVecMul(this.state.Q, u);
        const u_orth = MathUtils.sub(u, Qu);
        
        const n = MathUtils.norm(u_orth);
        if (n < 1e-7) return false;
        
        const u_new = MathUtils.scale(u_orth, 1/n);
        const P = MathUtils.outer(u_new, u_new);
        this.state.Q = MathUtils.matAdd(this.state.Q, P);
        this.state.history.push(u);
        this.state.rank++;
        return true;
    }

    public executeUsageEvent(): boolean {
        if (this.state.rank >= DIM) return false;
        const u = MathUtils.randomVec(DIM);
        const success = this.lithifyConstraint(u);
        if (success) {
            const g = MathUtils.randomVec(DIM);
            const Qg = MathUtils.matVecMul(this.state.Q, g);
            const g_fossil = MathUtils.sub(g, Qg);
            this.state.theta = MathUtils.normalize(MathUtils.add(this.state.theta, MathUtils.scale(g_fossil, 0.5)));
            return true;
        }
        return false;
    }

    public getMetrics() {
        const codim = DIM - this.state.rank;
        const vol = Math.exp(-this.state.rank);
        return {
            rank: this.state.rank,
            codimension: codim,
            volume_decay: vol,
        };
    }

    public probeDivergence(steps: number = 10, eta: number = 0.3) {
        if (this.state.rank === 0) return null;
        
        let thetaClone = [...this.state.theta];
        let currentTheta = [...this.state.theta];
        const results = [];

        for (let i = 0; i < steps; i++) {
            const g = MathUtils.randomVec(DIM);
            const Qg = MathUtils.matVecMul(this.state.Q, g);
            const g_fossil = MathUtils.sub(g, Qg);
            currentTheta = MathUtils.normalize(MathUtils.add(currentTheta, MathUtils.scale(g_fossil, eta)));
            thetaClone = MathUtils.normalize(MathUtils.add(thetaClone, MathUtils.scale(g, eta)));
            const diff = MathUtils.sub(currentTheta, thetaClone);
            const divergence = MathUtils.norm(diff);
            results.push({ step: i + 1, divergence });
        }
        this.state.theta = currentTheta;
        return results;
    }
}
