// Script for demonstrating BeamTrace2D
import { Wall, Source, Listener, Solver } from './beamtrace2d';
document.addEventListener('DOMContentLoaded', () => {
    // Basic drawing stuff
    const canvas = document.getElementById('beamCanvas');
    if (!canvas) {
        console.log('Error: canvas element not found');
        return;
    }
    const ctx = canvas.getContext('2d');
    if (!ctx) {
        console.log('Error: canvas not supported');
        return;
    }
    // First init the walls
    const walls = [
        new Wall([100, 130], [120, 220]), // Wall id 0
        new Wall([50, 55], [220, 60]), // Wall id 1
        new Wall([220, 60], [250, 220]), // Wall id 2...
        new Wall([50, 220], [200, 220]), // etc
        new Wall([50, 220], [50, 55]),
        new Wall([200, 220], [40, 230]),
        new Wall([40, 230], [30, 290]),
        new Wall([30, 290], [60, 270]),
        new Wall([60, 270], [290, 270]),
        new Wall([290, 270], [250, 220]),
    ];
    // Then a listener and a source
    const listener = new Listener([80, 100]);
    const source = new Source([200, 80]);
    // Pass the walls and the source to the solver, which does pre-calculations for fast solving
    const reflectionOrder = 4; // How many reflections do we want to calculate?
    let solver = new Solver(walls, source, reflectionOrder); // Init the solver
    // path_array will contain the reflection paths
    let pathArray = solver.getPaths(listener);
    // A function for painting the solution
    function redraw() {
        ctx.clearRect(0, 0, 300, 300);
        ctx.lineWidth = 2.0;
        walls.forEach((wall) => {
            wall.draw(ctx);
        });
        ctx.lineWidth = 1.0;
        listener.draw(ctx);
        source.draw(ctx);
        // Draw the paths
        if (pathArray) {
            for (let i = 0; i < pathArray.length; i++) {
                // Draw each path
                let first = true;
                ctx.strokeStyle = 'rgba(0,0,255,0.2)';
                ctx.beginPath();
                ctx.lineWidth = 2;
                pathArray[i].forEach((p) => {
                    if (first) {
                        ctx.moveTo(p[0], p[1]);
                        first = false;
                    }
                    else {
                        ctx.lineTo(p[0], p[1]);
                    }
                });
                ctx.stroke();
                ctx.strokeStyle = 'black';
                ctx.lineWidth = 1;
            }
        }
    }
    // Get canvas position for mouse coordinates
    function getMousePos(e) {
        const rect = canvas.getBoundingClientRect();
        return [e.clientX - rect.left, e.clientY - rect.top];
    }
    // If the walls or source position are updated, the solver needs to be initialized again
    canvas.addEventListener('click', (e) => {
        source.p0 = getMousePos(e); // Change the source position
        solver = new Solver(walls, source, reflectionOrder); // Init the solver with the new source position
        pathArray = solver.getPaths(listener); // Update reflection paths
        redraw();
    });
    // Update the listener position
    canvas.addEventListener('mousemove', (e) => {
        listener.p0 = getMousePos(e); // Change the listener position
        pathArray = solver.getPaths(listener); // Update reflection paths
        redraw();
    });
    redraw(); // First redraw
});
//# sourceMappingURL=main.js.map