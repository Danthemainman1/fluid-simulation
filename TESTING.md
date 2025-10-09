# Testing Guide

## Manual Testing Checklist

### Visual Verification
- [ ] Page loads without errors in the browser console
- [ ] Canvas fills the entire viewport
- [ ] Initial splats are visible with colorful patterns
- [ ] dat.GUI panel appears on the right side

### Mouse Interaction
- [ ] Moving mouse over canvas creates fluid motion
- [ ] Clicking and dragging adds colored density to the fluid
- [ ] Multiple simultaneous movements work correctly
- [ ] Fluid motion appears smooth and realistic

### Touch Interaction (Mobile)
- [ ] Single touch creates splats
- [ ] Touch and drag creates continuous motion
- [ ] Multi-touch is supported
- [ ] Touch interactions feel responsive

### GUI Controls
Test each parameter in the GUI:
- [ ] Simulation Resolution changes affect simulation detail
- [ ] Quality setting changes affect rendering detail
- [ ] Density Diffusion slider affects how quickly colors fade
- [ ] Viscosity slider affects fluid thickness
- [ ] Pressure slider affects internal pressure
- [ ] Vorticity slider affects swirling patterns
- [ ] Splat Radius slider affects interaction size
- [ ] Shading toggle works correctly
- [ ] Colorful toggle enables/disables color cycling
- [ ] Paused toggle stops/starts simulation
- [ ] Random Splats button adds multiple splats

### Bloom Effects
- [ ] Bloom enabled checkbox works
- [ ] Bloom Intensity slider affects glow strength
- [ ] Bloom Threshold slider affects when bloom appears

### Sunrays Effects
- [ ] Sunrays enabled checkbox works
- [ ] Sunrays Weight slider affects light scattering intensity

### Color Controls
- [ ] Background Color picker changes background
- [ ] Transparent toggle works correctly

### Performance
- [ ] Simulation runs at acceptable framerate (30+ FPS)
- [ ] No memory leaks during extended use
- [ ] Mobile devices maintain reasonable performance
- [ ] Lower quality settings improve performance

### Browser Compatibility
Test in multiple browsers:
- [ ] Chrome (desktop)
- [ ] Firefox (desktop)
- [ ] Safari (desktop)
- [ ] Edge (desktop)
- [ ] Chrome Mobile (Android)
- [ ] Safari Mobile (iOS)

### Responsiveness
- [ ] Simulation works on different screen sizes
- [ ] GUI is accessible on smaller screens
- [ ] Mobile devices automatically adjust quality
- [ ] Fullscreen mode works correctly

## Automated Testing

### Basic Validation
```bash
# Check for JavaScript syntax errors
node -c script.js

# Check HTML structure
# (Use an HTML validator or linter)
```

### WebGL Support Detection
Open the browser console and verify:
1. No WebGL context creation errors
2. All shaders compile successfully
3. All textures are created without errors
4. Framebuffers are complete

### Expected Console Output
- No JavaScript errors
- No WebGL errors
- Possible warnings about WebGL features on some systems (acceptable)

## Known Issues

### Sandboxed Environments
- Some testing environments may block CDN resources
- Software WebGL renderers may have limited capabilities
- These issues do not affect normal browser usage

### WebGL Compatibility
- Older devices without WebGL support will not work
- Some mobile devices may automatically reduce quality
- Linear filtering may not be available on all devices

## Reporting Issues

When reporting issues, please include:
- Browser name and version
- Operating system
- Device type (desktop/mobile/tablet)
- Console error messages
- Screenshots if applicable
- Steps to reproduce
