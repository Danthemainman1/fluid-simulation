# Eulerian Fluid Simulation

A real-time WebGL-based Eulerian fluid simulation that runs entirely in your browser. This implementation showcases the beauty of computational fluid dynamics using the Eulerian method.

![Eulerian Fluid Simulation](https://github.com/user-attachments/assets/63f3dadf-9808-4131-b743-608f548ed6a6)

## What is Eulerian Fluid Simulation?

An **Eulerian fluid simulation** is a grid-based approach to simulating fluid dynamics where:

- The computational domain is divided into a **fixed grid** of cells
- Each grid cell stores fluid properties (velocity, density, pressure)
- Fluid quantities are tracked at fixed spatial locations as the fluid flows through them
- Named after Leonhard Euler, who developed the foundational equations

### Key Characteristics

**Eulerian vs Lagrangian:**
- **Eulerian method** (this simulation): Observes fluid from fixed points in space, like watching a river from a bridge
- **Lagrangian method**: Follows individual fluid particles as they move, like dropping a leaf in water and tracking it

### Core Eulerian Components

This simulation implements the standard Eulerian fluid dynamics pipeline:

1. **Advection** - Transports velocity and dye through the velocity field using semi-Lagrangian advection
2. **Diffusion** - Smooths out velocity and density over time (viscosity and density dissipation)
3. **Pressure Projection** - Ensures the velocity field is incompressible (divergence-free) by solving the Poisson pressure equation using Jacobi iterations
4. **Vorticity Confinement** - Adds small-scale turbulence and swirling motion to maintain visual interest

## Features

- **Real-time GPU acceleration** using WebGL fragment shaders
- **Semi-Lagrangian advection** for stable, efficient transport
- **Iterative pressure solver** for incompressible flow
- **Vorticity confinement** for enhanced turbulence
- **Bloom and sunrays** post-processing effects
- **Interactive** - Click or touch to add fluid

## Controls

- **Mouse/Touch**: Click and drag to inject colored fluid
- **Spacebar**: Generate random splats
- **P key**: Pause/unpause simulation

## Adjustable Parameters

- **Viscosity** (Velocity Dissipation): Controls how quickly velocity decays (0-4)
- **Density Diffusion**: Controls how quickly color fades (0-4)
- **Vorticity** (Curl): Controls the amount of swirling turbulence (0-50)
- **Pressure**: Affects the incompressibility enforcement (0-1)
- **Splat Radius**: Size of fluid injection (0.01-1)
- **Bloom Intensity**: Post-processing glow effect (0.1-2)

## Technical Details

### Eulerian Method Implementation

The simulation runs on a fixed grid with the following steps each frame:

```
1. Apply vorticity confinement to velocity field
2. Calculate velocity field divergence
3. Solve for pressure using Jacobi iterations (makes field divergence-free)
4. Subtract pressure gradient from velocity (projection step)
5. Advect velocity by itself (self-advection)
6. Advect dye by velocity field
7. Render to screen with optional bloom/sunrays
```

### Shaders

All physics computations happen in GPU fragment shaders:
- `advectionShader` - Semi-Lagrangian advection using backward particle tracing
- `divergenceShader` - Computes divergence of velocity field
- `curlShader` - Computes vorticity (curl of velocity)
- `vorticityShader` - Applies vorticity confinement force
- `pressureShader` - Jacobi iteration for Poisson equation
- `gradientSubtractShader` - Makes velocity divergence-free (Helmholtz-Hodge decomposition)

### Grid Resolution

- **SIM_RESOLUTION**: Resolution of the velocity/pressure grids (default 128x128)
- **DYE_RESOLUTION**: Resolution of the color/dye grid (default 1024x1024)

Lower resolutions run faster but with less detail. The Eulerian method's grid-based nature makes it highly suitable for GPU acceleration.

## Running Locally

1. Clone the repository
2. Serve the files using any HTTP server:
   ```bash
   python3 -m http.server 8080
   ```
3. Open `http://localhost:8080` in a modern browser with WebGL support

## Browser Requirements

- Modern browser with WebGL 2.0 support (Chrome, Firefox, Safari, Edge)
- For best performance: Hardware with GPU acceleration

## Credits

Based on the work of Pavel Dobryakov's WebGL Fluid Simulation, implementing Eulerian fluid dynamics on the GPU using Jos Stam's "Stable Fluids" method.

## License

MIT License - See source code for full license text

## Learn More

- [Jos Stam's "Stable Fluids" paper](https://www.dgp.toronto.edu/public_user/stam/reality/Research/pdf/ns.pdf) - The foundational paper for real-time Eulerian fluid simulation
- [GPU Gems Chapter on Fluid Simulation](https://developer.nvidia.com/gpugems/gpugems/part-vi-beyond-triangles/chapter-38-fast-fluid-dynamics-simulation-gpu)
