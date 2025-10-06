# WebGL Fluid Simulation

A stunning WebGL-based fluid dynamics simulation featuring realistic physics and beautiful visual effects. This implementation is based on Pavel Dobryakov's [WebGL Fluid Simulation](https://github.com/PavelDoGreat/WebGL-Fluid-Simulation) (MIT License).

![Fluid Simulation](https://github.com/user-attachments/assets/131ade93-9976-4efd-9561-937b254f6f21)

## Features

- **Real-time fluid dynamics** using Navier-Stokes equations
- **Advanced visual effects** including bloom, sunrays, and shading
- **Interactive controls** via sliders for fine-tuning simulation parameters
- **Mouse and touch support** for creating fluid splats
- **Responsive design** that works on desktop and mobile devices
- **Performance monitoring** with FPS tracking (when Chart.js is available)
- **WebGL2 support** with automatic fallback to WebGL 1.0

## Live Demo

Open `index.html` in a modern web browser to see the simulation in action.

## Controls

### Interactive Parameters

- **Viscosity** (0-4): Controls fluid thickness and resistance to flow
- **Density Diffusion** (0-4): Controls how quickly color dissipates
- **Vorticity** (0-50): Controls the strength of rotational forces
- **Splat Radius** (0.01-1): Size of the fluid splats created by interaction
- **Bloom Intensity** (0.1-2): Strength of the bloom post-processing effect
- **Pressure** (0-1): Pressure solver parameter affecting fluid behavior

### Keyboard Shortcuts

- **P**: Pause/unpause the simulation
- **Space**: Create random splats

### Mouse/Touch Interaction

- Click and drag on the canvas to create colorful fluid splats
- Multiple touch points supported on touch devices

## Technical Details

The simulation implements:

- **Advection**: Semi-Lagrangian method for transporting velocity and dye
- **Pressure solving**: Jacobi iteration for incompressible flow
- **Vorticity confinement**: Adds rotational forces for more interesting dynamics
- **Bloom effect**: Multi-pass Gaussian blur for glowing appearance
- **Sunrays effect**: Radial blur for light ray simulation
- **Multiple render targets**: Efficient use of framebuffers for simulation steps

## Browser Compatibility

Requires a browser with WebGL support:
- Chrome 56+
- Firefox 51+
- Safari 11+
- Edge 79+

## License

MIT License - see the license header in `script.js` for full details.

Based on the original work by Pavel Dobryakov.

## Credits

- Original implementation: [Pavel Dobryakov](https://github.com/PavelDoGreat)
- UI framework: [dat.GUI](https://github.com/dataarts/dat.gui)
- Performance charts: [Chart.js](https://www.chartjs.org/)