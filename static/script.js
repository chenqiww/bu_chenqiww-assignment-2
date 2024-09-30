let dataPoints = [];
let centroids = [];
let clusters = [];
let stepCount = 0;
let manualMode = false;
let hasConverged = false;
let initialCentroidsDisplayed = false; 


function initializeClustering() {
    const method = document.getElementById('init-method').value;
    let k = parseInt(document.getElementById('num-clusters').value);

    if (isNaN(k) || k < 1) {
        alert('Please enter a valid number of clusters (k >= 1).');
        return;
    }

    centroids = [];
    clusters = [];
    stepCount = 0;
    hasConverged = false;
    initialCentroidsDisplayed = false; 

    if (method === 'Manual') {
        manualMode = true;
        document.getElementById('instructions').style.display = 'block';

        if (dataPoints.length === 0) {
            fetch('/get_data_points', { method: 'GET' })
            .then(response => response.json())
            .then(data => {
                dataPoints = data.data_points;
                plotDataWithClickEvent(k);
            });
        } else {
            plotDataWithClickEvent(k);
        }
    } else {
        manualMode = false;
        document.getElementById('instructions').style.display = 'none';

        if (dataPoints.length === 0) {
            fetch('/get_data_points', { method: 'GET' })
            .then(response => response.json())
            .then(data => {
                dataPoints = data.data_points;
                plotData();
            });
        } else {
            plotData();
        }
    }
}

document.getElementById('step').onclick = () => {
    if (hasConverged) {
        alert('The model has already converged.');
        return;
    }

    if (manualMode && centroids.length === 0) {
        alert('Please select centroids by clicking on the plot.');
        return;
    }

    let payload = {};

    if (!initialCentroidsDisplayed) {
        if (manualMode) {
            // Display initial centroids without performing a clustering step
            plotClusters(); // Plot data points with centroids
            alert('Initial centroids displayed. Click "Step" to proceed.');
            initialCentroidsDisplayed = true; // Set the flag to true
            return;
        } else {
            // Non-manual mode, initialize centroids and display them
            const method = document.getElementById('init-method').value;
            let k = parseInt(document.getElementById('num-clusters').value);

            payload.method = method;
            payload.k = k;

            fetch('/initialize_centroids', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            })
            .then(response => response.json())
            .then(data => {
                centroids = data.centroids;
                stepCount = 0; // Set stepCount to 0
                plotClusters(); // Plot data points with initial centroids
                alert('Initial centroids displayed. Click "Step" to proceed.');
                initialCentroidsDisplayed = true; // Set the flag to true
            });
            return; // Exit the function to prevent performing a clustering step
        }
    }

    // Prepare payload for clustering step
    if (manualMode) {
        payload.centroids = centroids;
    }

    // Perform a clustering step
    fetch('/step', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    })
    .then(response => response.json())
    .then(data => {
        if (data.message === 'Converged') {
            hasConverged = true;
            alert('The model has converged.');
        } else {
            centroids = data.centroids;
            clusters = data.clusters;
            stepCount = data.step;
            plotClusters();
        }
    });
};



document.getElementById('run').onclick = () => {
    if (hasConverged) {
        alert('The model has already converged.');
        return;
    }

    if (manualMode && centroids.length === 0) {
        alert('Please select centroids by clicking on the plot.');
        return;
    }

    let payload = {};

    if (manualMode) {
        payload.centroids = centroids;
    } else if (centroids.length === 0) {
        // Initialize centroids before running
        const method = document.getElementById('init-method').value;
        let k = parseInt(document.getElementById('num-clusters').value);

        payload.method = method;
        payload.k = k;
    }

    fetch('/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    })
    .then(response => response.json())
    .then(data => {
        hasConverged = true;
        centroids = data.centroids;
        clusters = data.clusters;
        stepCount = data.step;
        plotClusters();
    });
};

document.getElementById('reset').onclick = () => {
    fetch('/reset', { method: 'POST' })
    .then(response => response.json())
    .then(data => {
        centroids = [];
        clusters = [];
        stepCount = 0;
        hasConverged = false;
        initialCentroidsDisplayed = false; // Reset the flag
        manualMode = (document.getElementById('init-method').value === 'Manual');
        document.getElementById('instructions').style.display = manualMode ? 'block' : 'none';
        initializeClustering();
    });
};

document.getElementById('new-dataset').onclick = () => {
    fetch('/new_dataset', { method: 'POST' })
    .then(response => response.json())
    .then(data => {
        dataPoints = data.data_points;
        centroids = [];
        clusters = [];
        stepCount = 0;
        hasConverged = false;
        initialCentroidsDisplayed = false; // Reset the flag
        manualMode = (document.getElementById('init-method').value === 'Manual');
        document.getElementById('instructions').style.display = manualMode ? 'block' : 'none';
        initializeClustering();
    });
};


document.getElementById('init-method').onchange = () => {
    manualMode = (document.getElementById('init-method').value === 'Manual');
    initializeClustering();
};

document.getElementById('num-clusters').onchange = () => {
    initializeClustering();
};

function plotDataWithClickEvent(k) {
    const plotDiv = document.getElementById('plot');

    const trace = {
        x: dataPoints.map(p => p[0]),
        y: dataPoints.map(p => p[1]),
        mode: 'markers',
        type: 'scatter',
        marker: { color: 'blue' },
        name: 'Data Points'
    };

    // Initialize centroidTrace using existing centroids
    const centroidTrace = {
        x: centroids.map(c => c[0]),
        y: centroids.map(c => c[1]),
        mode: 'markers',
        marker: { color: 'red', symbol: 'x', size: 12 },
        name: 'Centroids'
    };

    const data = [trace, centroidTrace];

    const layout = {
        title: 'KMeans Clustering Initialization (Manual Mode)',
        showlegend: true
    };

    Plotly.newPlot(plotDiv, data, layout).then(function() {
        // Remove any existing click event listeners
        plotDiv.removeAllListeners('plotly_click');

        plotDiv.on('plotly_click', function(clickData) {
            if (centroids.length < k) {
                const x = clickData.points[0].x;
                const y = clickData.points[0].y;
                centroids.push([x, y]);

                // Update centroidTrace by reconstructing from centroids
                centroidTrace.x = centroids.map(c => c[0]);
                centroidTrace.y = centroids.map(c => c[1]);

                // Update the plot without re-initializing it
                Plotly.react(plotDiv, data, layout);
            }
            if (centroids.length === k) {
                alert('You have selected all centroids.');
                plotDiv.removeAllListeners('plotly_click');
                hasConverged = false; // Reset convergence flag
            }
        });
    });
}

function plotData() {
    const trace = {
        x: dataPoints.map(p => p[0]),
        y: dataPoints.map(p => p[1]),
        mode: 'markers',
        type: 'scatter',
        marker: { color: 'blue' },
        name: 'Data Points'
    };

    let data = [trace];

    const layout = {
        title: 'KMeans Clustering',
        showlegend: true
    };

    Plotly.react('plot', data, layout);
}

function plotClusters() {
    const colors = ['red', 'green', 'blue', 'orange', 'purple', 'cyan'];
    let traces = [];

    if (clusters.length > 0) {
        traces = clusters.map((cluster, idx) => ({
            x: cluster.map(p => p[0]),
            y: cluster.map(p => p[1]),
            mode: 'markers',
            type: 'scatter',
            marker: { color: colors[idx % colors.length] },
            name: `Cluster ${idx + 1}`
        }));
    } else {
        // Before any clustering steps, display data points without cluster assignments
        traces = [{
            x: dataPoints.map(p => p[0]),
            y: dataPoints.map(p => p[1]),
            mode: 'markers',
            type: 'scatter',
            marker: { color: 'blue' },
            name: 'Data Points'
        }];
    }

    const centroidTrace = {
        x: centroids.map(c => c[0]),
        y: centroids.map(c => c[1]),
        mode: 'markers',
        marker: { color: 'black', symbol: 'x', size: 12 },
        name: 'Centroids'
    };

    const layout = {
        title: `KMeans Clustering - Step ${stepCount}`,
        showlegend: true
    };

    Plotly.react('plot', [...traces, centroidTrace], layout);
}


// Automatically initialize when the page loads
document.addEventListener('DOMContentLoaded', () => {
    initializeClustering();
});
