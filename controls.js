// Chart.js and Parameter Control Implementation
// Wait for DOM to load and ensure Chart.js is available
window.addEventListener('DOMContentLoaded', function() {
    // Performance monitoring variables
    let fpsData = [];
    let maxDataPoints = 60;
    let lastFrameTime = performance.now();
    let frameCount = 0;
    let fps = 0;
    
    // Initialize Chart.js only if available
    const chartCanvas = document.getElementById('performance-chart');
    if (!chartCanvas) {
        console.error('Performance chart canvas not found');
        return;
    }
    
    let performanceChart = null;
    
    if (typeof Chart !== 'undefined') {
        const ctx = chartCanvas.getContext('2d');
        
        // Create performance chart
        performanceChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: Array(maxDataPoints).fill(''),
                datasets: [{
                    label: 'FPS',
                    data: fpsData,
                    borderColor: '#44aaff',
                    backgroundColor: 'rgba(68, 170, 255, 0.1)',
                    borderWidth: 2,
                    tension: 0.4,
                    fill: true,
                    pointRadius: 0
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                animation: false,
                scales: {
                    x: {
                        display: false
                    },
                    y: {
                        beginAtZero: true,
                        max: 60,
                        ticks: {
                            color: '#fff',
                            font: {
                                size: 10
                            }
                        },
                        grid: {
                            color: 'rgba(255, 255, 255, 0.1)'
                        }
                    }
                },
                plugins: {
                    legend: {
                        display: true,
                        labels: {
                            color: '#fff',
                            font: {
                                size: 11
                            }
                        }
                    }
                }
            }
        });
    }
    
    // Update FPS tracking
    function updateFPS() {
        frameCount++;
        const currentTime = performance.now();
        const elapsed = currentTime - lastFrameTime;
        
        if (elapsed >= 1000) {
            fps = Math.round((frameCount * 1000) / elapsed);
            frameCount = 0;
            lastFrameTime = currentTime;
            
            if (performanceChart) {
                // Update chart data
                fpsData.push(fps);
                if (fpsData.length > maxDataPoints) {
                    fpsData.shift();
                }
                performanceChart.update('none');
            }
        }
        
        requestAnimationFrame(updateFPS);
    }
    
    updateFPS();
    
    // Setup slider controls
    const sliders = {
        viscosity: {
            slider: document.getElementById('viscosity-slider'),
            value: document.getElementById('viscosity-value'),
            config: 'VELOCITY_DISSIPATION'
        },
        density: {
            slider: document.getElementById('density-slider'),
            value: document.getElementById('density-value'),
            config: 'DENSITY_DISSIPATION'
        },
        vorticity: {
            slider: document.getElementById('vorticity-slider'),
            value: document.getElementById('vorticity-value'),
            config: 'CURL'
        },
        splatRadius: {
            slider: document.getElementById('splat-radius-slider'),
            value: document.getElementById('splat-radius-value'),
            config: 'SPLAT_RADIUS'
        },
        bloomIntensity: {
            slider: document.getElementById('bloom-intensity-slider'),
            value: document.getElementById('bloom-intensity-value'),
            config: 'BLOOM_INTENSITY'
        },
        pressure: {
            slider: document.getElementById('pressure-slider'),
            value: document.getElementById('pressure-value'),
            config: 'PRESSURE'
        }
    };
    
    // Add event listeners to sliders
    Object.keys(sliders).forEach(key => {
        const { slider, value, config: configKey } = sliders[key];
        
        if (!slider || !value) {
            console.warn(`Slider or value element not found for ${key}`);
            return;
        }
        
        slider.addEventListener('input', function() {
            const newValue = parseFloat(this.value);
            value.textContent = newValue;
            
            // Update config if it exists
            if (typeof config !== 'undefined' && config[configKey] !== undefined) {
                config[configKey] = newValue;
                console.log(`Updated ${configKey} to ${newValue}`);
            }
        });
        
        // Initialize display value
        value.textContent = slider.value;
    });
    
    console.log('Controls initialized successfully');
});
