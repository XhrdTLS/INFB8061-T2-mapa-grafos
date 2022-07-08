// Selector de botones, para definir los parametros
var header = document.querySelector(".controles");
var btns = header.getElementsByClassName("botones_control");
for (var i = 0; i < btns.length; i++) {
    btns[i].addEventListener("click", function () {
        var current = document.getElementsByClassName("active");
        current[0].className = current[0].className.replace(" active", "");
        this.className += " active";
    });
}

var screen = d3.select(".sector-pantalla");

var inicia = document.querySelector("#start");
inicia.addEventListener("click", mostrarElementos);

var reinicia = document.querySelector("#clear_screen");
reinicia.addEventListener("click", restart);

/* Variables */
var yoffset = 4;
var w = 550, h = 400 - yoffset, radio = 12;

/* Definicion del CANVAS */
screen.attr("width", w).attr("height", h);
console.log(w, h)
screen.on("contextmenu", function () {
    d3.event.preventDefault();
});

function mostrarElementos() {
    for (let i = 0; i < 20; i++) {
        for (let j = 0; j < 20; j++) {
            screen.append('div')
                .text(nodos[i][j])
                .attr('class', 'nodos');
        }
    }
}

function num_rand() {
    return Math.floor((Math.random() * (19 - 1)) + 1);
}
/* Seccion Grafos */
class Graph {
    constructor(graph) {
        if (graph instanceof Map) {
            validateDeep(graph);
            this.graph = graph;
        } else if (graph) {
            this.graph = toDeepMap(graph);
        } else {
            this.graph = new Map();
        }
    }

    addNode(name, neighbors) {
        let nodes;
        if (neighbors instanceof Map) {
            validateDeep(neighbors);
            nodes = neighbors;
        } else {
            nodes = toDeepMap(neighbors);
        }

        this.graph.set(name, nodes);

        return this;
    }

    removeNode(key) {
        this.graph = removeDeepFromMap(this.graph, key);

        return this;
    }

    path(start, goal, options = {}) {
        // Don't run when we don't have nodes set
        if (!this.graph.size) {
            if (options.cost) return { path: null, cost: 0 };

            return null;
        }

        const explored = new Set();
        const frontier = new PriorityQueue();
        const previous = new Map();

        let path = [];
        let totalCost = 0;

        let avoid = [];
        if (options.avoid) avoid = [].concat(options.avoid);

        if (avoid.includes(start)) {
            throw new Error(`Starting node (${start}) cannot be avoided`);
        } else if (avoid.includes(goal)) {
            throw new Error(`Ending node (${goal}) cannot be avoided`);
        }

        // Add the starting point to the frontier, it will be the first node visited
        frontier.set(start, 0);

        // Run until we have visited every node in the frontier
        while (!frontier.isEmpty()) {
            // Get the node in the frontier with the lowest cost (`priority`)
            const node = frontier.next();

            // When the node with the lowest cost in the frontier in our goal node,
            // we can compute the path and exit the loop
            if (node.key === goal) {
                // Set the total cost to the current value
                totalCost = node.priority;

                let nodeKey = node.key;
                while (previous.has(nodeKey)) {
                    path.push(nodeKey);
                    nodeKey = previous.get(nodeKey);
                }

                break;
            }

            // Add the current node to the explored set
            explored.add(node.key);

            // Loop all the neighboring nodes
            const neighbors = this.graph.get(node.key) || new Map();
            neighbors.forEach((nCost, nNode) => {
                // If we already explored the node, or the node is to be avoided, skip it
                if (explored.has(nNode) || avoid.includes(nNode)) return null;

                // If the neighboring node is not yet in the frontier, we add it with
                // the correct cost
                if (!frontier.has(nNode)) {
                    previous.set(nNode, node.key);
                    return frontier.set(nNode, node.priority + nCost);
                }

                const frontierPriority = frontier.get(nNode).priority;
                const nodeCost = node.priority + nCost;

                // Otherwise we only update the cost of this node in the frontier when
                // it's below what's currently set
                if (nodeCost < frontierPriority) {
                    previous.set(nNode, node.key);
                    return frontier.set(nNode, nodeCost);
                }

                return null;
            });
        }

        // Return null when no path can be found
        if (!path.length) {
            if (options.cost) return { path: null, cost: 0 };

            return null;
        }

        // From now on, keep in mind that `path` is populated in reverse order,
        // from destination to origin

        // Remove the first value (the goal node) if we want a trimmed result
        if (options.trim) {
            path.shift();
        } else {
            // Add the origin waypoint at the end of the array
            path = path.concat([start]);
        }

        // Reverse the path if we don't want it reversed, so the result will be
        // from `start` to `goal`
        if (!options.reverse) {
            path = path.reverse();
        }

        // Return an object if we also want the cost
        if (options.cost) {
            return {
                path,
                cost: totalCost,
            };
        }

        return path;
    }

}

class PriorityQueue {
    /* Creates a new empty priority queue*/
    constructor() {
        // The `keys` set is used to greatly improve the speed at which we can
        // check the presence of a value in the queue
        this.keys = new Set();
        this.queue = [];
    }

    sort() {
        this.queue.sort((a, b) => a.priority - b.priority);
    }


    set(key, value) {
        const priority = Number(value);
        if (isNaN(priority)) throw new TypeError('"priority" must be a number');

        if (!this.keys.has(key)) {
            // Insert a new entry if the key is not already in the queue
            this.keys.add(key);
            this.queue.push({ key, priority });
        } else {
            // Update the priority of an existing key
            this.queue.map((element) => {
                if (element.key === key) {
                    Object.assign(element, { priority });
                }

                return element;
            });
        }

        this.sort();
        return this.queue.length;
    }

    next() {
        const element = this.queue.shift();

        // Remove the key from the `_keys` set
        this.keys.delete(element.key);

        return element;
    }

    isEmpty() {
        return Boolean(this.queue.length === 0);
    }

    has(key) {
        return this.keys.has(key);
    }

    get(key) {
        return this.queue.find(element => element.key === key);
    }

}

function removeDeepFromMap(map, key) {
    const newMap = new Map();

    for (const [aKey, val] of map) {
        if (aKey !== key && val instanceof Map) {
            newMap.set(aKey, removeDeepFromMap(val, key));
        } else if (aKey !== key) {
            newMap.set(aKey, val);
        }
    }

    return newMap;
}

function isValidNode(val) {
    const cost = Number(val);

    if (isNaN(cost) || cost <= 0) {
        return false;
    }

    return true;
}

function toDeepMap(source) {
    const map = new Map();
    const keys = Object.keys(source);

    keys.forEach((key) => {
        const val = source[key];

        if (val !== null && typeof val === 'object' && !Array.isArray(val)) {
            return map.set(key, toDeepMap(val));
        }

        if (!isValidNode(val)) {
            throw new Error(`Could not add node at key "${key}", make sure it's a valid node`, val);
        }

        return map.set(key, Number(val));
    });

    return map;
}

function validateDeep(map) {
    if (!(map instanceof Map)) {
        throw new Error(`Invalid graph: Expected Map instead found ${typeof map}`);
    }

    map.forEach((value, key) => {
        if (typeof value === 'object' && value instanceof Map) {
            validateDeep(value);
            return;
        }

        if (typeof value !== 'number' || value <= 0) {
            throw new Error(`Values must be numbers greater than 0. Found value ${value} at ${key}`);
        }
    });
}

// poblar Grafos
const nodos = [
    ['AA', 'AB', 'AC', 'AD', 'AE', 'AF', 'AG', 'AH', 'AI', 'AJ', 'AK', 'AL', 'AM', 'AN', 'AO', 'AP', 'AQ', 'AR', 'AS', 'AT'],
    ['BA', 'BB', 'BC', 'BD', 'BE', 'BF', 'BG', 'BH', 'BI', 'BJ', 'BK', 'BL', 'BM', 'BN', 'BO', 'BP', 'BQ', 'BR', 'BS', 'BT'],
    ['CA', 'CB', 'CC', 'CD', 'CE', 'CF', 'CG', 'CH', 'CI', 'CJ', 'CK', 'CL', 'CM', 'CN', 'CO', 'CP', 'CQ', 'CR', 'CS', 'CT'],
    ['DA', 'DB', 'DC', 'DD', 'DE', 'DF', 'DG', 'DH', 'DI', 'DJ', 'DK', 'DL', 'DM', 'DN', 'DO', 'DP', 'DQ', 'DR', 'DS', 'DT'],
    ['EA', 'EB', 'EC', 'ED', 'EE', 'EF', 'EG', 'EH', 'EI', 'EJ', 'EK', 'EL', 'EM', 'EN', 'EO', 'EP', 'EQ', 'ER', 'ES', 'ET'],
    ['FA', 'FB', 'FC', 'FD', 'FE', 'FF', 'FG', 'FH', 'FI', 'FJ', 'FK', 'FL', 'FM', 'FN', 'FO', 'FP', 'FQ', 'FR', 'FS', 'FT'],
    ['GA', 'GB', 'GC', 'GD', 'GE', 'GF', 'GG', 'GH', 'GI', 'GJ', 'GK', 'GL', 'GM', 'GN', 'GO', 'GP', 'GQ', 'GR', 'GS', 'GT'],
    ['HA', 'HB', 'HC', 'HD', 'HE', 'HF', 'HG', 'HH', 'HI', 'HJ', 'HK', 'HL', 'HM', 'HN', 'HO', 'HP', 'HQ', 'HR', 'HS', 'HT'],
    ['IA', 'IB', 'IC', 'ID', 'IE', 'IF', 'IG', 'IH', 'II', 'IJ', 'IK', 'IL', 'IM', 'IN', 'IO', 'IP', 'IQ', 'IR', 'IS', 'IT'],
    ['JA', 'JB', 'JC', 'JD', 'JE', 'JF', 'JG', 'JH', 'JI', 'JJ', 'JK', 'JL', 'JM', 'JN', 'JO', 'JP', 'JQ', 'JR', 'JS', 'JT'],
    ['KA', 'KB', 'KC', 'KD', 'KE', 'KF', 'KG', 'KH', 'KI', 'KJ', 'KK', 'KL', 'KM', 'KN', 'KO', 'KP', 'KQ', 'KR', 'KS', 'KT'],
    ['LA', 'LB', 'LC', 'LD', 'LE', 'LF', 'LG', 'LH', 'LI', 'LJ', 'LK', 'LL', 'LM', 'LN', 'LO', 'LP', 'LQ', 'LR', 'LS', 'LT'],
    ['MA', 'MB', 'MC', 'MD', 'ME', 'MF', 'MG', 'MH', 'MI', 'MJ', 'MK', 'ML', 'MM', 'MN', 'MO', 'MP', 'MQ', 'MR', 'MS', 'MT'],
    ['NA', 'NB', 'NC', 'ND', 'NE', 'NF', 'NG', 'NH', 'NI', 'NJ', 'NK', 'NL', 'NM', 'NN', 'NO', 'NP', 'NQ', 'NR', 'NS', 'NT'],
    ['OA', 'OB', 'OC', 'OD', 'OE', 'OF', 'OG', 'OH', 'OI', 'OJ', 'OK', 'OL', 'OM', 'ON', 'OO', 'OP', 'OQ', 'OR', 'OS', 'OT'],
    ['PA', 'PB', 'PC', 'PD', 'PE', 'PF', 'PG', 'PH', 'PI', 'PJ', 'PK', 'PL', 'PM', 'PN', 'PO', 'PP', 'PQ', 'PR', 'PS', 'PT'],
    ['QA', 'QB', 'QC', 'QD', 'QE', 'QF', 'QG', 'QH', 'QI', 'QJ', 'QK', 'QL', 'QM', 'QN', 'QO', 'QP', 'QQ', 'QR', 'QS', 'QT'],
    ['RA', 'RB', 'RC', 'RD', 'RE', 'RF', 'RG', 'RH', 'RI', 'RJ', 'RK', 'RL', 'RM', 'RN', 'RO', 'RP', 'RQ', 'RR', 'RS', 'RT'],
    ['SA', 'SB', 'SC', 'SD', 'SE', 'SF', 'SG', 'SH', 'SI', 'SJ', 'SK', 'SL', 'SM', 'SN', 'SO', 'SP', 'SQ', 'SR', 'SS', 'ST'],
    ['TA', 'TB', 'TC', 'TD', 'TE', 'TF', 'TG', 'TH', 'TI', 'TJ', 'TK', 'TL', 'TM', 'TN', 'TO', 'TP', 'TQ', 'TR', 'TS', 'TT'],
];

// Se define Grafo
function crearGrafo() {
    const route = new Graph();
    //COLUMNA A
    route.addNode(nodos[0][0], { 'AB': num_rand(), 'BA': num_rand() })
    route.addNode(nodos[0][1], { 'AA': num_rand(), 'BB': num_rand(), 'AC': num_rand() })
    route.addNode(nodos[0][2], { 'AB': num_rand(), 'BC': num_rand(), 'AD': num_rand() })
    route.addNode(nodos[0][3], { 'AC': num_rand(), 'BD': num_rand(), 'AE': num_rand() })
    route.addNode(nodos[0][4], { 'AD': num_rand(), 'BE': num_rand(), 'AF': num_rand() })
    route.addNode(nodos[0][5], { 'AE': num_rand(), 'BF': num_rand(), 'AG': num_rand() })
    route.addNode(nodos[0][6], { 'AF': num_rand(), 'BG': num_rand(), 'AH': num_rand() })
    route.addNode(nodos[0][7], { 'AG': num_rand(), 'BH': num_rand(), 'AI': num_rand() })
    route.addNode(nodos[0][8], { 'AH': num_rand(), 'BI': num_rand(), 'AJ': num_rand() })
    route.addNode(nodos[0][9], { 'AI': num_rand(), 'BJ': num_rand(), 'AK': num_rand() })
    route.addNode(nodos[0][10], { 'AJ': num_rand(), 'BK': num_rand(), 'AL': num_rand() })
    route.addNode(nodos[0][11], { 'AK': num_rand(), 'BL': num_rand(), 'AM': num_rand() })
    route.addNode(nodos[0][12], { 'AL': num_rand(), 'BM': num_rand(), 'AN': num_rand() })
    route.addNode(nodos[0][13], { 'AM': num_rand(), 'BN': num_rand(), 'AO': num_rand() })
    route.addNode(nodos[0][14], { 'AN': num_rand(), 'BO': num_rand(), 'AP': num_rand() })
    route.addNode(nodos[0][15], { 'AO': num_rand(), 'BP': num_rand(), 'AQ': num_rand() })
    route.addNode(nodos[0][16], { 'AP': num_rand(), 'BQ': num_rand(), 'AR': num_rand() })
    route.addNode(nodos[0][17], { 'AQ': num_rand(), 'BR': num_rand(), 'AS': num_rand() })
    route.addNode(nodos[0][18], { 'AR': num_rand(), 'BS': num_rand(), 'AT': num_rand() })
    route.addNode(nodos[0][19], { 'AS': num_rand(), 'BT': num_rand() })
    //COLUMNA B
    route.addNode(nodos[1][0], { 'AA': num_rand(), 'BB': num_rand(), 'CA': num_rand() })
    route.addNode(nodos[1][1], { 'AB': num_rand(), 'BC': num_rand(), 'BA': num_rand(), 'CB': num_rand() })
    route.addNode(nodos[1][2], { 'AC': num_rand(), 'BD': num_rand(), 'BB': num_rand(), 'CC': num_rand() })
    route.addNode(nodos[1][3], { 'AD': num_rand(), 'BE': num_rand(), 'BC': num_rand(), 'CD': num_rand() })
    route.addNode(nodos[1][4], { 'AE': num_rand(), 'BF': num_rand(), 'BD': num_rand(), 'CE': num_rand() })
    route.addNode(nodos[1][5], { 'AF': num_rand(), 'BG': num_rand(), 'BE': num_rand(), 'CF': num_rand() })
    route.addNode(nodos[1][6], { 'AG': num_rand(), 'BH': num_rand(), 'BF': num_rand(), 'CG': num_rand() })
    route.addNode(nodos[1][7], { 'AH': num_rand(), 'BI': num_rand(), 'BG': num_rand(), 'CH': num_rand() })
    route.addNode(nodos[1][8], { 'AI': num_rand(), 'BJ': num_rand(), 'BH': num_rand(), 'CI': num_rand() })
    route.addNode(nodos[1][9], { 'AJ': num_rand(), 'BK': num_rand(), 'BI': num_rand(), 'CJ': num_rand() })
    route.addNode(nodos[1][10], { 'AK': num_rand(), 'BL': num_rand(), 'BJ': num_rand(), 'CK': num_rand() })
    route.addNode(nodos[1][11], { 'AL': num_rand(), 'BM': num_rand(), 'BK': num_rand(), 'CL': num_rand() })
    route.addNode(nodos[1][12], { 'AM': num_rand(), 'BN': num_rand(), 'BL': num_rand(), 'CM': num_rand() })
    route.addNode(nodos[1][13], { 'AN': num_rand(), 'BO': num_rand(), 'BM': num_rand(), 'CN': num_rand() })
    route.addNode(nodos[1][14], { 'AO': num_rand(), 'BP': num_rand(), 'BN': num_rand(), 'CO': num_rand() })
    route.addNode(nodos[1][15], { 'AP': num_rand(), 'BQ': num_rand(), 'BO': num_rand(), 'CP': num_rand() })
    route.addNode(nodos[1][16], { 'AR': num_rand(), 'BR': num_rand(), 'BP': num_rand(), 'CQ': num_rand() })
    route.addNode(nodos[1][17], { 'AS': num_rand(), 'BS': num_rand(), 'BQ': num_rand(), 'CR': num_rand() })
    route.addNode(nodos[1][18], { 'AT': num_rand(), 'BT': num_rand(), 'BR': num_rand(), 'CS': num_rand() })
    route.addNode(nodos[1][19], { 'AT': num_rand(), 'BS': num_rand(), 'CT': num_rand() })
    //COLUMNA C
    route.addNode(nodos[2][0], { 'BA': num_rand(), 'CB': num_rand(), 'DA': num_rand() })
    route.addNode(nodos[2][1], { 'BB': num_rand(), 'CA': num_rand(), 'CC': num_rand(), 'DB': num_rand() })
    route.addNode(nodos[2][2], { 'BC': num_rand(), 'CB': num_rand(), 'CD': num_rand(), 'DC': num_rand() })
    route.addNode(nodos[2][3], { 'BD': num_rand(), 'CC': num_rand(), 'CE': num_rand(), 'DD': num_rand() })
    route.addNode(nodos[2][4], { 'BE': num_rand(), 'CE': num_rand(), 'CF': num_rand(), 'DE': num_rand() })
    route.addNode(nodos[2][5], { 'BF': num_rand(), 'CF': num_rand(), 'CG': num_rand(), 'DF': num_rand() })
    route.addNode(nodos[2][6], { 'BG': num_rand(), 'CG': num_rand(), 'CH': num_rand(), 'DG': num_rand() })
    route.addNode(nodos[2][7], { 'BH': num_rand(), 'CH': num_rand(), 'CI': num_rand(), 'DH': num_rand() })
    route.addNode(nodos[2][8], { 'BI': num_rand(), 'CI': num_rand(), 'CJ': num_rand(), 'DI': num_rand() })
    route.addNode(nodos[2][9], { 'BJ': num_rand(), 'CJ': num_rand(), 'CK': num_rand(), 'DJ': num_rand() })
    route.addNode(nodos[2][10], { 'BK': num_rand(), 'CK': num_rand(), 'CL': num_rand(), 'DK': num_rand() })
    route.addNode(nodos[2][11], { 'BL': num_rand(), 'CL': num_rand(), 'CM': num_rand(), 'DL': num_rand() })
    route.addNode(nodos[2][12], { 'BM': num_rand(), 'CM': num_rand(), 'CN': num_rand(), 'DM': num_rand() })
    route.addNode(nodos[2][13], { 'BN': num_rand(), 'CN': num_rand(), 'CO': num_rand(), 'DN': num_rand() })
    route.addNode(nodos[2][14], { 'BO': num_rand(), 'CO': num_rand(), 'CP': num_rand(), 'DO': num_rand() })
    route.addNode(nodos[2][15], { 'BP': num_rand(), 'CP': num_rand(), 'CQ': num_rand(), 'DP': num_rand() })
    route.addNode(nodos[2][16], { 'BQ': num_rand(), 'CQ': num_rand(), 'CT': num_rand(), 'DQ': num_rand() })
    route.addNode(nodos[2][17], { 'BR': num_rand(), 'CR': num_rand(), 'CS': num_rand(), 'DR': num_rand() })
    route.addNode(nodos[2][18], { 'BS': num_rand(), 'CS': num_rand(), 'CT': num_rand(), 'DS': num_rand() })
    route.addNode(nodos[2][19], { 'BT': num_rand(), 'CS': num_rand(), 'DT': num_rand() })
    //COLUMNA D

    console.log(route.path(nodos[2][0], nodos[0][8]))
}

function restart() { }