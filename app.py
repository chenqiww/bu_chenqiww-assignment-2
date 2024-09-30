from flask import Flask, render_template, request, jsonify
import numpy as np

app = Flask(__name__)

# Global variables to store the dataset and cluster info
data_points = []
clusters = []
centroids = []
step = 0
max_steps = 100

def generate_dataset():
    global data_points
    data_points = np.random.randn(300, 2).tolist()

# Generate the dataset once when the app starts
generate_dataset()

def initialize_centroids(method, k=3):
    global centroids
    if method == 'Random':
        centroids = random_initialization(k)
    elif method == 'Farthest First':
        centroids = farthest_first_initialization(k)
    elif method == 'KMeans++':
        centroids = kmeans_plus_plus_initialization(k)
    else:
        centroids = []  # For manual initialization

def random_initialization(k):
    indices = np.random.choice(len(data_points), k, replace=False)
    return [data_points[i] for i in indices]

def farthest_first_initialization(k):
    centroids = []
    centroids.append(data_points[np.random.randint(len(data_points))])
    for _ in range(1, k):
        distances = [min([np.linalg.norm(np.array(p)-np.array(c)) for c in centroids]) for p in data_points]
        next_centroid = data_points[np.argmax(distances)]
        centroids.append(next_centroid)
    return centroids

def kmeans_plus_plus_initialization(k):
    centroids = []
    centroids.append(data_points[np.random.randint(len(data_points))])
    for _ in range(1, k):
        distances = [min([np.linalg.norm(np.array(p)-np.array(c))**2 for c in centroids]) for p in data_points]
        distances_sum = sum(distances)
        if distances_sum == 0:
            probabilities = [1/len(data_points)] * len(data_points)
        else:
            probabilities = [d / distances_sum for d in distances]
        cumulative_probabilities = np.cumsum(probabilities)
        r = np.random.rand()
        for idx, c_prob in enumerate(cumulative_probabilities):
            if r < c_prob:
                centroids.append(data_points[idx])
                break
    return centroids

def assign_clusters():
    global clusters
    clusters = [[] for _ in centroids]
    for point in data_points:
        distances = [np.linalg.norm(np.array(point)-np.array(centroid)) for centroid in centroids]
        cluster_idx = np.argmin(distances)
        clusters[cluster_idx].append(point)

def update_centroids():
    global centroids
    new_centroids = []
    for cluster in clusters:
        if cluster:
            new_centroids.append(np.mean(cluster, axis=0).tolist())
        else:
            # Handle empty clusters by keeping the centroid at the same place
            new_centroids.append(centroids[len(new_centroids)])
    centroids = new_centroids

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/get_data_points', methods=['GET'])
def get_data_points():
    return jsonify({'data_points': data_points})

@app.route('/initialize', methods=['POST'])
def initialize():
    return jsonify({
        'data_points': data_points
    })

@app.route('/step', methods=['POST'])
def kmeans_step():
    global centroids, clusters, step

    data = request.get_json(force=True)

    if not centroids:
        # Initialize centroids if they are not initialized
        if data.get('centroids'):
            centroids = [list(map(float, c)) for c in data['centroids']]
            step = 0  # Reset step count
        else:
            method = data.get('method')
            k = int(data.get('k', 3))
            initialize_centroids(method, k)
            step = 0  # Reset step count

    previous_centroids = centroids.copy()
    assign_clusters()
    update_centroids()
    step += 1

    if previous_centroids == centroids:
        return jsonify({'message': 'Converged'})
    else:
        return jsonify({
            'centroids': centroids,
            'clusters': clusters,
            'step': step
        })

@app.route('/run', methods=['POST'])
def kmeans_run():
    global centroids, clusters, step

    data = request.get_json(force=True)
    if not centroids:
        # Initialize centroids if they are not initialized
        if data.get('centroids'):
            centroids = [list(map(float, c)) for c in data['centroids']]
            step = 0  # Reset step count
        else:
            method = data.get('method')
            k = int(data.get('k', 3))
            initialize_centroids(method, k)
            step = 0  # Reset step count

    while step < max_steps:
        previous_centroids = centroids.copy()
        assign_clusters()
        update_centroids()
        step += 1
        if previous_centroids == centroids:
            break

    return jsonify({
        'centroids': centroids,
        'clusters': clusters,
        'step': step
    })

@app.route('/reset', methods=['POST'])
def reset():
    global centroids, clusters, step
    centroids = []
    clusters = []
    step = 0
    return jsonify({'message': 'Reset successful'})

@app.route('/new_dataset', methods=['POST'])
def new_dataset():
    global data_points, centroids, clusters, step
    generate_dataset()
    centroids = []
    clusters = []
    step = 0
    return jsonify({
        'message': 'New dataset generated',
        'data_points': data_points
    })
    
@app.route('/initialize_centroids', methods=['POST'])
def initialize_centroids_route():
    global centroids, step

    data = request.get_json(force=True)
    method = data.get('method')
    k = int(data.get('k', 3))
    initialize_centroids(method, k)
    step = 0  # Set step count to 0
    return jsonify({'centroids': centroids})


if __name__ == '__main__':
    app.run(debug=False, host='127.0.0.1', port=3000)
