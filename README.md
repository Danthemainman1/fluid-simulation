# WebGL Fluid Simulation

An interactive, real-time 2D fluid simulation built with WebGL, implementing the Navier-Stokes equations for realistic fluid dynamics.

## Features

### Fluid Dynamics Engine
- **Navier-Stokes Solver**: Accurate 2D fluid simulation with proper physics
- **Advection**: Particles and velocity fields are carried along with the flow
- **Diffusion**: Natural spreading and dissipation of velocity and density
- **Pressure Projection**: Ensures incompressibility of the fluid
- **Vorticity Confinement**: Adds realistic swirling patterns to the flow

### Interactive Controls
- **Mouse/Touch Interaction**: Click and drag to add fluid density and create motion
- **Continuous Splats**: Mouse movement generates continuous fluid ripples
- **Multi-touch Support**: Multiple simultaneous touch points on mobile devices

### Visual Effects
- **Bloom Effect**: Creates glowing halos around bright areas
- **Sunrays Effect**: Simulates light scattering through the fluid
- **Shading**: Optional 3D-like shading based on fluid density gradients
- **Colorful Mode**: Automatically cycles through different colors

### Customizable Parameters
All parameters can be adjusted in real-time via the GUI:

- **Simulation Resolution**: Controls the detail level of the physics simulation (32-256)
- **Quality**: Display resolution for rendering (128-1024)
- **Density Diffusion**: How quickly the fluid density dissipates (0-4)
- **Viscosity**: Fluid thickness/resistance to flow (0-4)
- **Pressure**: Internal fluid pressure (0-1)
- **Vorticity**: Amount of swirling motion (0-50)
- **Splat Radius**: Size of the interaction area (0.01-1)
- **Bloom Intensity**: Strength of the glow effect (0.1-2)
- **Bloom Threshold**: Brightness threshold for bloom (0-1)
- **Sunrays Weight**: Intensity of light scattering effect (0.3-1)
- **Background Color**: Custom background color
- **Transparent**: Toggle transparent background

## Usage

### Online
Visit the [GitHub Pages deployment](https://danthemainman1.github.io/fluid-simulation/) to use the simulation directly in your browser.

### Local Development
1. Clone this repository:
   ```bash
   git clone https://github.com/Danthemainman1/fluid-simulation.git
   cd fluid-simulation
   ```

2. Serve the files using any local web server. For example:
   ```bash
   # Using Python 3
   python -m http.server 8000
   
   # Using Node.js http-server
   npx http-server
   ```

3. Open your browser and navigate to `http://localhost:8000`

## Technical Details

### WebGL Implementation
- Uses WebGL 2.0 when available, falls back to WebGL 1.0
- Half-float textures for efficient memory usage and better precision
- Multiple framebuffer objects for ping-pong rendering
- Custom GLSL shaders for all fluid simulation steps

### Performance Optimization
- Adjustable simulation and display resolutions
- Efficient GPU-based computation
- Optimized for both desktop and mobile devices
- Automatic quality adjustment for mobile devices

### Browser Compatibility
- Modern browsers with WebGL support
- Chrome, Firefox, Safari, Edge
- Mobile browsers (iOS Safari, Chrome Mobile)

## Controls

- **Click/Tap and Drag**: Add fluid density and create motion
- **GUI Panel**: Adjust all simulation parameters in real-time
- **Random Splats Button**: Add multiple random splats to the simulation
- **Paused Toggle**: Pause/resume the simulation

## Deployment to GitHub Pages

This project is configured for easy deployment to GitHub Pages:

1. Push your changes to the repository
2. Enable GitHub Pages in repository settings (Settings > Pages)
3. Select the branch to deploy (usually `main` or `master`)
4. The site will be available at `https://[username].github.io/fluid-simulation/`

## Credits

Based on fluid simulation techniques and the Navier-Stokes equations. Inspired by various WebGL fluid simulation implementations and computer graphics research.

## License

MIT License - Feel free to use this project for learning or in your own projects.

## References

- Jos Stam, "Real-Time Fluid Dynamics for Games"
- GPU Gems series on fluid simulation
- WebGL and GLSL specifications
