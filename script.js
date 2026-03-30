// script.js
$(document).ready(function () {
    const canvas = document.getElementById('sketchCanvas');
    const ctx = canvas.getContext('2d');
    let isDrawing = false;
    let lastX = 0, lastY = 0;
    let currentTool = 0; // 0=brush, 1=eraser, 2=smudge, 3=marker, 4=airbrush
    let brushColor = '#00ff9d';
    let brushSize = 12;
    let undoStack = [];
    let redoStack = [];
    
    // Layers simulation (simple single canvas with fake layers UI)
    let layers = [
        { name: 'Background', visible: true, opacity: 1 },
        { name: 'Sketch Layer', visible: true, opacity: 1 }
    ];
    let activeLayer = 1;
    
    // Resize canvas to fill available space
    function resizeCanvas() {
        const container = document.getElementById('canvasContainer');
        const maxW = container.clientWidth - 40;
        const maxH = container.clientHeight - 40;
        canvas.width = Math.min(maxW, 1400);
        canvas.height = Math.min(maxH, 900);
        ctx.lineJoin = 'round';
        ctx.lineCap = 'round';
        ctx.shadowBlur = 0;
        // Restore background
        ctx.fillStyle = '#1a1a1a';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
    }
    
    // Save current state for undo
    function saveState() {
        undoStack.push(canvas.toDataURL());
        if (undoStack.length > 30) undoStack.shift();
        redoStack = [];
    }
    
    // Drawing functions
    function draw(e) {
        if (!isDrawing) return;
        
        const rect = canvas.getBoundingClientRect();
        let x = e.clientX || e.touches[0].clientX;
        let y = e.clientY || e.touches[0].clientY;
        x = x - rect.left;
        y = y - rect.top;
        
        ctx.lineWidth = brushSize;
        
        if (currentTool === 1) { // Eraser
            ctx.globalCompositeOperation = 'destination-out';
            ctx.strokeStyle = 'rgba(0,0,0,1)';
        } else if (currentTool === 2) { // Smudge
            ctx.globalCompositeOperation = 'source-atop';
            ctx.shadowBlur = 15;
            ctx.shadowColor = brushColor;
        } else {
            ctx.globalCompositeOperation = 'source-over';
            ctx.shadowBlur = currentTool === 4 ? 25 : 1;
            ctx.shadowColor = brushColor;
            ctx.strokeStyle = brushColor;
        }
        
        ctx.beginPath();
        ctx.moveTo(lastX, lastY);
        ctx.lineTo(x, y);
        ctx.stroke();
        
        lastX = x;
        lastY = y;
    }
    
    // Mouse / Touch events
    function startDrawing(e) {
        e.preventDefault();
        isDrawing = true;
        saveState();
        
        const rect = canvas.getBoundingClientRect();
        lastX = (e.clientX || e.touches[0].clientX) - rect.left;
        lastY = (e.clientY || e.touches[0].clientY) - rect.top;
        
        // First dot
        ctx.lineWidth = brushSize;
        ctx.fillStyle = brushColor;
        ctx.beginPath();
        ctx.arc(lastX, lastY, brushSize / 2, 0, Math.PI * 2);
        ctx.fill();
    }
    
    function stopDrawing() {
        isDrawing = false;
        ctx.shadowBlur = 0;
        ctx.globalCompositeOperation = 'source-over';
    }
    
    // Tool selector
    window.setTool = function (tool) {
        currentTool = tool;
        $('.tool-btn').removeClass('active');
        $('.tool-btn').eq(tool).addClass('active');
        
        // Change cursor hint
        if (tool === 1) canvas.style.cursor = 'crosshair';
        else canvas.style.cursor = 'crosshair';
    };
    
    window.setColor = function (color) {
        brushColor = color;
    };
    
    // Brush size
    function updateBrushPreview() {
        brushSize = parseInt($('#brushSize').val());
        $('#sizeValue').text(brushSize);
    }
    
    // Undo / Redo
    window.undo = function () {
        if (undoStack.length === 0) return;
        redoStack.push(canvas.toDataURL());
        const previous = undoStack.pop();
        const img = new Image();
        img.onload = () => {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.drawImage(img, 0, 0);
        };
        img.src = previous;
    };
    
    window.redo = function () {
        if (redoStack.length === 0) return;
        undoStack.push(canvas.toDataURL());
        const next = redoStack.pop();
        const img = new Image();
        img.onload = () => {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.drawImage(img, 0, 0);
        };
        img.src = next;
    };
    
    // Clear canvas
    window.clearCanvas = function () {
        if (confirm('Clear entire canvas?')) {
            saveState();
            ctx.fillStyle = '#1a1a1a';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
        }
    };
    
    // New canvas
    window.newCanvas = function () {
        if (confirm('Start a fresh sketch?')) {
            saveState();
            ctx.fillStyle = '#1a1a1a';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            layers = [{ name: 'Background', visible: true, opacity: 1 }, { name: 'Sketch Layer', visible: true, opacity: 1 }];
            renderLayers();
        }
    };
    
    // Fake layers UI
    function renderLayers() {
        let html = '';
        layers.forEach((layer, i) => {
            html += `
            <div class="layers-item d-flex align-items-center justify-content-between p-3 border-bottom border-success rounded-3 mb-2 ${i === activeLayer ? 'bg-success bg-opacity-10' : ''}" onclick="setActiveLayer(${i})">
                <div>
                    <i class="bi bi-${layer.visible ? 'eye' : 'eye-slash'} me-2"></i>
                    ${layer.name}
                </div>
                <input type="range" min="10" max="100" value="${layer.opacity*100}" class="form-range w-50" onchange="changeOpacity(${i}, this.value)">
            </div>`;
        });
        $('#layersList').html(html);
    }
    
    window.addLayer = function () {
        layers.push({ name: 'New Layer ' + (layers.length + 1), visible: true, opacity: 1 });
        renderLayers();
    };
    
    window.deleteLayer = function () {
        if (layers.length > 1) {
            layers.splice(activeLayer, 1);
            activeLayer = Math.max(0, activeLayer - 1);
            renderLayers();
        }
    };
    
    window.setActiveLayer = function (i) {
        activeLayer = i;
        renderLayers();
    };
    
    window.changeOpacity = function (i, val) {
        layers[i].opacity = val / 100;
    };
    
    window.toggleLayersPanel = function () {
        $('#layersPanel').toggleClass('d-none');
    };
    
    // Toggle guide lines (simple grid)
    let guideOn = false;
    window.toggleGuide = function () {
        guideOn = !guideOn;
        if (guideOn) {
            ctx.save();
            ctx.strokeStyle = 'rgba(0,255,157,0.15)';
            ctx.lineWidth = 1;
            for (let x = 50; x < canvas.width; x += 50) {
                ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, canvas.height); ctx.stroke();
            }
            for (let y = 50; y < canvas.height; y += 50) {
                ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(canvas.width, y); ctx.stroke();
            }
            ctx.restore();
        } else {
            // Refresh canvas (simple redraw would need stored image – for demo just alert)
            alert('✅ Infinite canvas guides enabled (demo)');
        }
    };
    
    // Color swatches
    function createSwatches() {
        const colors = ['#00ff9d', '#ff00aa', '#00aaff', '#ffff00', '#ff5500', '#7700ff', '#ffffff', '#000000'];
        let html = '';
        colors.forEach(c => {
            html += `<div class="swatch" style="background:${c}" onclick="setColor('${c}');$('#colorPicker').val('${c}')"></div>`;
        });
        $('#swatches').html(html);
    }
    
    // Mobile tools toggle
    window.toggleMobileTools = function () {
        $('#mobileTools').toggleClass('d-none');
    };
    
    // Fake logout
    window.fakeLogout = function (e) {
        e.preventDefault();
        if (confirm('Exit this Sketchbook demo?')) location.reload();
    };
    
    // Hide welcome
    window.hideWelcome = function () {
        $('#welcomeOverlay').addClass('d-none');
    };
    
    // Initialize everything
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
    
    // Canvas event listeners
    canvas.addEventListener('mousedown', startDrawing);
    canvas.addEventListener('mousemove', draw);
    canvas.addEventListener('mouseup', stopDrawing);
    canvas.addEventListener('mouseout', stopDrawing);
    
    // Touch support
    canvas.addEventListener('touchstart', startDrawing);
    canvas.addEventListener('touchmove', draw);
    canvas.addEventListener('touchend', stopDrawing);
    
    // Initial render
    ctx.fillStyle = '#1a1a1a';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    createSwatches();
    renderLayers();
    
    // Show welcome on first load
    setTimeout(() => {
        $('#welcomeOverlay').removeClass('d-none');
    }, 800);
    
    console.log('%c✅ Sketchbook Web Clone ready! Natural drawing with ❤️ by SAMER SAEID', 'color:#00ff9d; font-weight:bold; font-size:15px');
});
