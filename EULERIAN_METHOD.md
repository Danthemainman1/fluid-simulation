# Eulerian Fluid Simulation Method - Technical Overview

## Implementation Summary

This project implements a **real-time Eulerian fluid simulation** using WebGL shaders for GPU acceleration. The simulation solves the Navier-Stokes equations for incompressible fluid flow on a fixed computational grid.

## Eulerian vs Lagrangian Methods

### Eulerian Method (This Implementation)
- **Grid-based**: Fixed spatial grid where fluid properties are sampled
- **Viewpoint**: Observes fluid from stationary points in space
- **Analogy**: Like watching a river from a bridge
- **Advantages**: 
  - Natural for GPU parallelization
  - Efficient for grid-based operations
  - Well-suited for diffusion and pressure solving
  - Stable and predictable behavior

### Lagrangian Method (Alternative Approach)
- **Particle-based**: Individual particles carry fluid properties
- **Viewpoint**: Follows individual fluid elements as they move
- **Analogy**: Like tracking a leaf floating down a river
- **Advantages**:
  - Natural for advection
  - No grid artifacts
  - Adaptive resolution

## Mathematical Foundation

The simulation is based on the **Navier-Stokes equations** for incompressible flow:

```
∂u/∂t + (u·∇)u = -∇p + ν∇²u + f    (momentum equation)
∇·u = 0                               (incompressibility constraint)
```

Where:
- `u` is the velocity field
- `p` is the pressure field
- `ν` is the kinematic viscosity
- `f` is the external force (user input)

## Simulation Pipeline

Each frame, the simulation performs these steps in order:

### 1. Vorticity Confinement
```glsl
// Compute curl (vorticity) of velocity field
curl = ∇ × u

// Apply vorticity confinement force
f_vorticity = ε(N × ω)
u = u + dt * f_vorticity
```
**Purpose**: Adds small-scale turbulence to compensate for numerical dissipation

### 2. Divergence Computation
```glsl
// Calculate divergence of velocity field
div(u) = ∂u_x/∂x + ∂u_y/∂y
```
**Purpose**: Measures how much the field is compressing/expanding

### 3. Pressure Solve (Jacobi Iterations)
```glsl
// Solve Poisson equation: ∇²p = ∇·u
// Iteratively: p^(n+1) = (p_left + p_right + p_top + p_bottom - div) / 4
```
**Purpose**: Find pressure field that will make velocity divergence-free
**Method**: Iterative Jacobi solver (20 iterations by default)

### 4. Gradient Subtraction (Projection)
```glsl
// Make velocity field incompressible
u = u - ∇p
```
**Purpose**: Enforce incompressibility by subtracting pressure gradient
**Result**: Velocity field is now divergence-free (∇·u = 0)

### 5. Self-Advection
```glsl
// Semi-Lagrangian advection
u(x,t+dt) = u(x - u(x,t)·dt, t)
```
**Purpose**: Transport velocity field by itself using backward particle tracing
**Method**: Semi-Lagrangian (unconditionally stable)

### 6. Dye Advection
```glsl
// Advect color/dye field by velocity
dye(x,t+dt) = dye(x - u(x,t)·dt, t)
```
**Purpose**: Transport visual dye/color by the velocity field

### 7. Dissipation
```glsl
// Apply viscosity and density dissipation
u = u / (1 + dissipation * dt)
dye = dye / (1 + dissipation * dt)
```
**Purpose**: Gradually reduce velocity and color intensity over time

## Key Eulerian Characteristics

### Grid-Based Storage
- Velocity field: `velocity[x][y] = (vx, vy)`
- Pressure field: `pressure[x][y] = p`
- Dye field: `dye[x][y] = (r, g, b)`

### Semi-Lagrangian Advection
Instead of moving grid values forward (unstable), we:
1. For each grid point, trace backward along velocity
2. Sample the field at that backward-traced position
3. Assign sampled value to current grid point

This is **unconditionally stable** even with large time steps!

### Pressure Projection
The key to incompressibility in Eulerian methods:
1. Compute divergence of velocity
2. Solve for pressure that will cancel this divergence
3. Subtract pressure gradient from velocity

This is also called the **Helmholtz-Hodge decomposition**.

## Shader Implementation

All physics computations run on the GPU via fragment shaders:

| Shader | Purpose | Output |
|--------|---------|--------|
| `advectionShader` | Semi-Lagrangian transport | Advected field |
| `divergenceShader` | Compute ∇·u | Divergence |
| `curlShader` | Compute ∇×u | Vorticity |
| `vorticityShader` | Apply vorticity force | Updated velocity |
| `pressureShader` | Jacobi iteration for pressure | Pressure |
| `gradientSubtractShader` | Subtract ∇p from u | Projected velocity |

## Performance Characteristics

### Computational Complexity
- **Per frame**: O(n) where n = grid cells
- **Pressure solve**: O(n × iterations)
- **Total**: O(n) since iterations is constant

### GPU Optimization
- All operations are embarrassingly parallel
- Each pixel/cell computed independently
- Perfect for GPU fragment shaders
- Real-time even on integrated GPUs

### Grid Resolution Trade-offs
- **Low resolution** (64×64): Fast but blocky
- **Medium resolution** (128×128): Good balance (default)
- **High resolution** (256×256): Detailed but slower

## Configuration Parameters

### Physical Parameters
- **Viscosity** (VELOCITY_DISSIPATION): How "thick" the fluid is
- **Density Diffusion** (DENSITY_DISSIPATION): How fast color fades
- **Vorticity** (CURL): Amount of turbulence/swirling
- **Pressure** (PRESSURE): Incompressibility enforcement strength

### Numerical Parameters
- **SIM_RESOLUTION**: Velocity/pressure grid resolution
- **DYE_RESOLUTION**: Color grid resolution
- **PRESSURE_ITERATIONS**: Accuracy of pressure solve (higher = more accurate but slower)

## Stability and Accuracy

### Unconditional Stability
The semi-Lagrangian advection scheme is **unconditionally stable**:
- No CFL condition to satisfy
- Works with large time steps
- No numerical explosion

### Numerical Dissipation
Eulerian methods naturally dissipate energy:
- Advection introduces artificial viscosity
- Pressure projection smooths the field
- Vorticity confinement compensates for this

### Conservation Properties
- **Mass**: Automatically conserved (incompressibility)
- **Momentum**: Approximately conserved
- **Energy**: Not conserved (dissipative)

## Comparison with Alternatives

### SPH (Smoothed Particle Hydrodynamics)
- Lagrangian particle method
- Better for splashing, free surfaces
- More complex for pressure solving

### Lattice Boltzmann Method
- Mesoscopic approach
- Better for complex boundaries
- Higher memory requirements

### Eulerian (This Method)
- Best for:
  - Real-time visualization
  - GPU acceleration
  - Smooth continuous fields
  - Simple incompressible flow

## References

1. **Jos Stam (1999)**: "Stable Fluids" - SIGGRAPH 1999
   - Introduced semi-Lagrangian advection for stability
   - Foundation for real-time Eulerian simulation

2. **Robert Bridson**: "Fluid Simulation for Computer Graphics"
   - Comprehensive textbook on computational fluid dynamics

3. **GPU Gems Chapter 38**: "Fast Fluid Dynamics Simulation on the GPU"
   - GPU implementation techniques

## Conclusion

This implementation demonstrates a complete, working Eulerian fluid simulation using:
- ✅ Grid-based discretization
- ✅ Semi-Lagrangian advection
- ✅ Pressure projection for incompressibility
- ✅ Vorticity confinement for turbulence
- ✅ GPU acceleration via WebGL shaders
- ✅ Real-time interactive performance

The Eulerian method's grid-based nature makes it ideal for GPU parallelization and real-time applications, which is why it's widely used in games, visual effects, and interactive simulations.
