// Chart.js and Parameter Control Implementation
// Wait for DOM to load and ensure Chart.js is available
window.addEventListener('DOMContentLoaded', function() {
    // Performance monitoring variables
    let fpsData = [];
    let maxDataPoints = 60;
    let lastFrameTime = performance.now();
    let frameCount = 0;
    let fps = 0;
    
    // Initialize Chart.js
    const chartCanvas = document.getElementById('performance-chart');
    let performanceChart = null;
    
    if (chartCanvas && typeof Chart !== 'undefined') {
        const ctx = chartCanvas.getContext('2d');
        
        // Create performance chart
        performanceChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: Array(maxDataPoints).fill(''),
            datasets: [{
                label: 'FPS',
                data: fpsData,
                borderColor: '#667eea',
                backgroundColor: 'rgba(102, 126, 234, 0.1)',
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
                        color: 'rgba(255, 255, 255, 0.7)',
                        font: {
                            size: 10,
                            family: 'Inter'
                        }
                    },
                    grid: {
                        color: 'rgba(255, 255, 255, 0.05)'
                    }
                }
            },
            plugins: {
                legend: {
                    display: true,
                    labels: {
                        color: 'rgba(255, 255, 255, 0.9)',
                        font: {
                            size: 11,
                            family: 'Inter',
                            weight: '500'
                        }
                    }
                }
            }
        }
        });
    } else {
        console.warn('Chart.js not loaded, performance chart disabled');
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
            
            // Update chart data
            fpsData.push(fps);
            if (fpsData.length > maxDataPoints) {
                fpsData.shift();
            }
            if (performanceChart) {
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
    
    // Sidebar toggle functionality
    const sidebar = document.getElementById('controls-sidebar');
    const sidebarToggle = document.getElementById('sidebar-toggle');
    
    if (sidebar && sidebarToggle) {
        sidebarToggle.addEventListener('click', function() {
            sidebar.classList.toggle('open');
            this.textContent = sidebar.classList.contains('open') ? '✕' : '⚙️';
        });
        
        // Close sidebar when clicking outside on desktop
        document.addEventListener('click', function(e) {
            if (window.innerWidth > 768 && 
                sidebar.classList.contains('open') && 
                !sidebar.contains(e.target) && 
                !sidebarToggle.contains(e.target)) {
                sidebar.classList.remove('open');
                sidebarToggle.textContent = '⚙️';
            }
        });
    }
    
    // Music control functionality
    const musicControl = document.getElementById('music-control');
    const zenMusic = document.getElementById('zen-music');
    let isMusicPlaying = false;
    
    if (musicControl && zenMusic) {
        musicControl.addEventListener('click', function() {
            if (isMusicPlaying) {
                zenMusic.pause();
                this.textContent = '🎵';
                this.classList.remove('playing');
            } else {
                zenMusic.play().catch(err => {
                    console.warn('Music autoplay was prevented:', err);
                });
                this.textContent = '🔇';
                this.classList.add('playing');
            }
            isMusicPlaying = !isMusicPlaying;
        });
        
        // Auto-play music on user interaction (required by browsers)
        const startMusic = function() {
            if (!isMusicPlaying) {
                zenMusic.play().then(() => {
                    isMusicPlaying = true;
                    musicControl.textContent = '🔇';
                    musicControl.classList.add('playing');
                }).catch(err => {
                    console.warn('Music autoplay was prevented:', err);
                });
            }
            // Remove listeners after first interaction
            document.removeEventListener('click', startMusic);
            document.removeEventListener('touchstart', startMusic);
        };
        
        // Try to start music on first user interaction
        document.addEventListener('click', startMusic);
        document.addEventListener('touchstart', startMusic);
    }
    
    // Header button functionality
    const randomizeBtn = document.getElementById('randomize-btn');
    const clearBtn = document.getElementById('clear-btn');
    
    if (randomizeBtn) {
        randomizeBtn.addEventListener('click', function() {
            // Trigger random splats (if splatStack exists in global scope)
            if (typeof splatStack !== 'undefined') {
                splatStack.push(parseInt(Math.random() * 20) + 5);
            }
        });
    }
    
    if (clearBtn) {
        clearBtn.addEventListener('click', function() {
            // Clear the simulation (if config exists in global scope)
            if (typeof config !== 'undefined') {
                // Toggle PAUSED to trigger a reset-like behavior
                const wasPaused = config.PAUSED;
                config.PAUSED = true;
                setTimeout(() => {
                    config.PAUSED = wasPaused;
                }, 100);
            }
        });
    }
    
    console.log('Controls initialized successfully');
});
