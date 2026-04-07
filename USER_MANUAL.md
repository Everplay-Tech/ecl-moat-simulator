# ECL: Algorithmic Moat Simulator - User Manual

## 1. Overview
**Entropic Constraint Lithification (ECL)** is a mathematical framework for simulating how path-dependent usage events "scar" a model's manifold, creating a permanent, algorithmic "moat." In this 10-dimensional simulator, we demonstrate the irreversible process by which a model's feasible parameter space is reduced over time as it adapts to usage constraints.

## 2. Core Concepts

### 2.1 The Manifold (10D Hypersphere)
The model exists in a 10-dimensional space. Initially, the model has full plasticity, meaning it can move in any of the 10 dimensions.

### 2.2 Lithification (Scarring)
Every "Usage Event" (executed via the `scar` command) generates a new constraint vector $u_t$. This vector represents a direction in which the model has "crystallized" its weights to satisfy a specific task or behavior. 
- **Grassmannian Join:** The constraint is added to a projector matrix $Q$.
- **Rank Accumulation:** As more unique constraints are added, the rank of $Q$ increases.
- **Fossilization:** When the rank reaches 10, the model is fully lithified (fossilized) and cannot move in any direction without violating its accumulated constraints.

### 2.3 The Moat (Trajectory Divergence)
The "moat" is verified by comparing the original model (which respects its scars) to a "cloned" model that has been wiped of its history ($Q=0$). 
- When both models are given the same target gradient, the original model can only move in its **nullspace** (the directions it hasn't scarred yet).
- The clone model moves blindly in the direction of the target.
- The resulting **Divergence (Δ)** represents the physical distance in parameter space created by the moat.

---

## 3. Using the Simulator

### 3.1 CLI Version (Interactive)
To run the interactive CLI:
```bash
npm run cli
```
**Commands:**
- `help`: Lists all commands.
- `scar`: Simulates a usage event. This adds a "scar" to the manifold, reducing its available dimensions.
- `metrics`: Displays the current Rank (how many scars), Codimension (how many dimensions remain), and Volume Decay.
- `probe [steps]`: Executes a divergence test. It clones the current model and shows how the original diverges from the clone over multiple training steps.
- `state`: Prints the raw 10D parameters ($\theta$) and the projection matrix ($Q$).
- `reset`: Restores the model to a clean, plastic state.

### 3.2 MCP Server Version
To run the MCP server for use with AI clients (like Claude or Gemini):
```bash
npm run build
npm start
```
**Available Tools:**
- `initialize_manifold`: Full reset.
- `execute_usage_event`: Adds one scar.
- `get_metrics`: Returns rank, codimension, and volume decay.
- `probe_divergence`: Runs a trajectory test and returns the $\Delta$ history.
- `get_state`: Returns the full model state.

---

## 4. Mathematical Interpretation

- **Ambient Dimension ($d$):** 10
- **Constraint Matrix ($Q$):** A symmetric matrix where $Q^2 = Q$. It projects vectors onto the space of all previous constraints.
- **Feasible Movement:** Any update $g$ is transformed into $g_{fossil} = (I - Q)g$.
- **Volume Decay:** Calculated as $\exp(-rank)$, representing the exponential shrinkage of the manifold's volume as constraints lithify.

---

## 5. Technical Requirements
- Node.js (v18+)
- TypeScript
- `@modelcontextprotocol/sdk` (installed automatically via `npm install`)
