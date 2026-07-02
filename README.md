# 💡 Lights Out Puzzle Simulator

A **5×5 toggle puzzle game** with an automated solver engine powered by **Gaussian Elimination over GF(2)**, real-time state management, and procedural puzzle generation.

![HTML5](https://img.shields.io/badge/HTML5-E34F26?style=flat&logo=html5&logoColor=white)
![CSS3](https://img.shields.io/badge/CSS3-1572B6?style=flat&logo=css3&logoColor=white)
![JavaScript](https://img.shields.io/badge/JavaScript-F7DF1E?style=flat&logo=javascript&logoColor=black)

## 🎮 Live Demo

Open `index.html` in any browser — no server or build step required.

## ✨ Features

- **5×5 Binary Grid Engine** — Cell state transitions with 4-directional toggle propagation across 25 cells
- **GF(2) Automated Solver** — O(n³) Gaussian Elimination over the binary field GF(2) to compute exact winning click sequences
- **Procedural Generation** — Randomized toggle sequences guarantee 100% solvability across 3 difficulty tiers (Easy / Medium / Hard)
- **Matrix Rank Evaluation** — Pre-emptive pruning of invalid configurations to eliminate unsolvable edge cases
- **Auto Solve Animation** — Step-by-step animated playback of the computed optimal solution
- **Hint System** — Highlights the next optimal cell to click
- **Real-time Stats** — Move counter, lights remaining, elapsed timer
- **Solution Matrix Visualization** — Live display of the solver's computed click map
- **Particle Network Background** — Animated canvas background with connected particle system

## 🧮 How the Solver Works

The game is modeled as a **system of linear equations over GF(2)** (the binary Galois field):

1. A **25×25 toggle matrix** `A` is built where `A[i][j] = 1` if pressing cell `j` toggles cell `i`
2. The current board state forms the target vector `b`
3. An **augmented matrix** `[A|b]` undergoes Gaussian Elimination with XOR operations
4. **Back-substitution** yields the solution vector — which cells to click
5. **Rank evaluation** determines solvability before attempting a solve

## 📁 Project Structure

```
lights-out-puzzle/
├── index.html      # Main HTML structure & layout
├── style.css       # Dark neon theme, animations, responsive design
├── game.js         # Game engine, GF(2) solver, procedural generator
└── README.md       # This file
```

## 🚀 Getting Started

1. Clone the repository:
   ```bash
   git clone https://github.com/YOUR_USERNAME/lights-out-puzzle.git
   ```
2. Open `index.html` in your browser
3. Play the game!

## 🎯 How to Play

1. Click any cell to **toggle** it and its **4 adjacent neighbors** (up, down, left, right)
2. Your goal is to turn **all lights OFF**
3. Choose from **3 difficulty levels** — Easy (3-5 clicks), Medium (8-12 clicks), Hard (15-20 clicks)
4. Use **Auto Solve** to watch the GF(2) solver find the optimal solution
5. Use **Hint** to reveal the next best cell to click

## 🛠️ Tech Stack

| Technology | Usage |
|---|---|
| **HTML5** | Semantic structure, SEO meta tags |
| **CSS3** | Glassmorphism, animations, responsive grid layout |
| **JavaScript** | Game engine, linear algebra solver, canvas particles |

## 📄 License

MIT License — feel free to use, modify, and distribute.
