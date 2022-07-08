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
var w = 1100, h = 500 - yoffset, radio = 12;

/* Definicion del CANVAS */
screen.attr("width", w).attr("height", h);
console.log(w, h)
screen.on("contextmenu", function () {
    d3.event.preventDefault();
});

function mostrarElementos() {
    crearGrafo()
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
    route.addNode(nodos[3][0], { 'CA': num_rand(), 'DB': num_rand(), 'EA': num_rand() })
    route.addNode(nodos[3][1], { 'CB': num_rand(), 'DA': num_rand(), 'DC': num_rand(), 'EB': num_rand() })
    route.addNode(nodos[3][2], { 'CC': num_rand(), 'DB': num_rand(), 'DD': num_rand(), 'EC': num_rand() })
    route.addNode(nodos[3][3], { 'CD': num_rand(), 'DC': num_rand(), 'DE': num_rand(), 'ED': num_rand() })
    route.addNode(nodos[3][4], { 'CE': num_rand(), 'DD': num_rand(), 'DF': num_rand(), 'EE': num_rand() })
    route.addNode(nodos[3][5], { 'CF': num_rand(), 'DE': num_rand(), 'DG': num_rand(), 'EF': num_rand() })
    route.addNode(nodos[3][6], { 'CG': num_rand(), 'DF': num_rand(), 'DH': num_rand(), 'EG': num_rand() })
    route.addNode(nodos[3][7], { 'CH': num_rand(), 'DG': num_rand(), 'DI': num_rand(), 'EH': num_rand() })
    route.addNode(nodos[3][8], { 'CI': num_rand(), 'DH': num_rand(), 'DJ': num_rand(), 'EI': num_rand() })
    route.addNode(nodos[3][9], { 'CJ': num_rand(), 'DI': num_rand(), 'DK': num_rand(), 'EJ': num_rand() })
    route.addNode(nodos[3][10], { 'CK': num_rand(), 'DJ': num_rand(), 'DL': num_rand(), 'EK': num_rand() })
    route.addNode(nodos[3][11], { 'CL': num_rand(), 'DK': num_rand(), 'DM': num_rand(), 'EL': num_rand() })
    route.addNode(nodos[3][12], { 'CM': num_rand(), 'DL': num_rand(), 'DN': num_rand(), 'EM': num_rand() })
    route.addNode(nodos[3][13], { 'CN': num_rand(), 'DM': num_rand(), 'DO': num_rand(), 'EN': num_rand() })
    route.addNode(nodos[3][14], { 'CO': num_rand(), 'DN': num_rand(), 'DP': num_rand(), 'EO': num_rand() })
    route.addNode(nodos[3][15], { 'CP': num_rand(), 'DO': num_rand(), 'DQ': num_rand(), 'EP': num_rand() })
    route.addNode(nodos[3][16], { 'CQ': num_rand(), 'DP': num_rand(), 'DR': num_rand(), 'EQ': num_rand() })
    route.addNode(nodos[3][17], { 'CR': num_rand(), 'DQ': num_rand(), 'DS': num_rand(), 'ET': num_rand() })
    route.addNode(nodos[3][18], { 'CS': num_rand(), 'DR': num_rand(), 'DT': num_rand(), 'ES': num_rand() })
    route.addNode(nodos[3][19], { 'BT': num_rand(), 'DS': num_rand(), 'ET': num_rand() })
    //COLUMNA E
    route.addNode(nodos[4][0], { 'DA': num_rand(), 'EB': num_rand(), 'FA': num_rand() })
    route.addNode(nodos[4][1], { 'DB': num_rand(), 'EA': num_rand(), 'EC': num_rand(), 'FB': num_rand() })
    route.addNode(nodos[4][2], { 'DC': num_rand(), 'EB': num_rand(), 'ED': num_rand(), 'FC': num_rand() })
    route.addNode(nodos[4][3], { 'DD': num_rand(), 'EC': num_rand(), 'EE': num_rand(), 'FD': num_rand() })
    route.addNode(nodos[4][4], { 'DE': num_rand(), 'ED': num_rand(), 'EF': num_rand(), 'FE': num_rand() })
    route.addNode(nodos[4][5], { 'DF': num_rand(), 'EE': num_rand(), 'EG': num_rand(), 'FF': num_rand() })
    route.addNode(nodos[4][6], { 'DG': num_rand(), 'EF': num_rand(), 'EH': num_rand(), 'FG': num_rand() })
    route.addNode(nodos[4][7], { 'DH': num_rand(), 'EG': num_rand(), 'EI': num_rand(), 'FH': num_rand() })
    route.addNode(nodos[4][8], { 'DI': num_rand(), 'EH': num_rand(), 'EJ': num_rand(), 'FI': num_rand() })
    route.addNode(nodos[4][9], { 'DJ': num_rand(), 'EI': num_rand(), 'EK': num_rand(), 'FJ': num_rand() })
    route.addNode(nodos[4][10], { 'DK': num_rand(), 'EJ': num_rand(), 'EL': num_rand(), 'FK': num_rand() })
    route.addNode(nodos[4][11], { 'DL': num_rand(), 'EK': num_rand(), 'EM': num_rand(), 'FL': num_rand() })
    route.addNode(nodos[4][12], { 'DM': num_rand(), 'EL': num_rand(), 'EN': num_rand(), 'FM': num_rand() })
    route.addNode(nodos[4][13], { 'DN': num_rand(), 'EM': num_rand(), 'EO': num_rand(), 'FN': num_rand() })
    route.addNode(nodos[4][14], { 'DO': num_rand(), 'EN': num_rand(), 'EP': num_rand(), 'FO': num_rand() })
    route.addNode(nodos[4][15], { 'DP': num_rand(), 'EO': num_rand(), 'EQ': num_rand(), 'FP': num_rand() })
    route.addNode(nodos[4][16], { 'DQ': num_rand(), 'EP': num_rand(), 'ER': num_rand(), 'FQ': num_rand() })
    route.addNode(nodos[4][17], { 'DR': num_rand(), 'EQ': num_rand(), 'ES': num_rand(), 'FR': num_rand() })
    route.addNode(nodos[4][18], { 'DS': num_rand(), 'ER': num_rand(), 'ET': num_rand(), 'FS': num_rand() })
    route.addNode(nodos[4][19], { 'DT': num_rand(), 'ES': num_rand(), 'FT': num_rand() })
    //COLUMNA F
    route.addNode(nodos[5][0], { 'EA': num_rand(), 'FB': num_rand(), 'GA': num_rand() })
    route.addNode(nodos[5][1], { 'EB': num_rand(), 'FA': num_rand(), 'FC': num_rand(), 'GB': num_rand() })
    route.addNode(nodos[5][2], { 'EC': num_rand(), 'FB': num_rand(), 'FD': num_rand(), 'GC': num_rand() })
    route.addNode(nodos[5][3], { 'ED': num_rand(), 'FC': num_rand(), 'FE': num_rand(), 'GD': num_rand() })
    route.addNode(nodos[5][4], { 'EE': num_rand(), 'FD': num_rand(), 'FF': num_rand(), 'GE': num_rand() })
    route.addNode(nodos[5][5], { 'EF': num_rand(), 'FE': num_rand(), 'FG': num_rand(), 'GF': num_rand() })
    route.addNode(nodos[5][6], { 'EG': num_rand(), 'FF': num_rand(), 'FH': num_rand(), 'GG': num_rand() })
    route.addNode(nodos[5][7], { 'EH': num_rand(), 'FG': num_rand(), 'FI': num_rand(), 'GH': num_rand() })
    route.addNode(nodos[5][8], { 'EI': num_rand(), 'FH': num_rand(), 'FJ': num_rand(), 'GI': num_rand() })
    route.addNode(nodos[5][9], { 'EJ': num_rand(), 'FI': num_rand(), 'FK': num_rand(), 'GJ': num_rand() })
    route.addNode(nodos[5][10], { 'EK': num_rand(), 'FJ': num_rand(), 'FL': num_rand(), 'GK': num_rand() })
    route.addNode(nodos[5][11], { 'EL': num_rand(), 'FK': num_rand(), 'FM': num_rand(), 'GL': num_rand() })
    route.addNode(nodos[5][12], { 'EM': num_rand(), 'FL': num_rand(), 'FN': num_rand(), 'GM': num_rand() })
    route.addNode(nodos[5][13], { 'EN': num_rand(), 'FM': num_rand(), 'FO': num_rand(), 'GN': num_rand() })
    route.addNode(nodos[5][14], { 'EO': num_rand(), 'FN': num_rand(), 'FP': num_rand(), 'GO': num_rand() })
    route.addNode(nodos[5][15], { 'EP': num_rand(), 'FO': num_rand(), 'FQ': num_rand(), 'GP': num_rand() })
    route.addNode(nodos[5][16], { 'EQ': num_rand(), 'FP': num_rand(), 'FR': num_rand(), 'GQ': num_rand() })
    route.addNode(nodos[5][17], { 'ER': num_rand(), 'FQ': num_rand(), 'FS': num_rand(), 'GR': num_rand() })
    route.addNode(nodos[5][18], { 'ES': num_rand(), 'FR': num_rand(), 'FT': num_rand(), 'GS': num_rand() })
    route.addNode(nodos[5][19], { 'ET': num_rand(), 'FS': num_rand(), 'GT': num_rand() })
    //COLUMNA G
    route.addNode(nodos[6][0], { 'FA': num_rand(), 'GB': num_rand(), 'HA': num_rand() })
    route.addNode(nodos[6][1], { 'FB': num_rand(), 'GA': num_rand(), 'GC': num_rand(), 'HB': num_rand() })
    route.addNode(nodos[6][2], { 'FC': num_rand(), 'GB': num_rand(), 'GD': num_rand(), 'HC': num_rand() })
    route.addNode(nodos[6][3], { 'FD': num_rand(), 'GC': num_rand(), 'GE': num_rand(), 'HD': num_rand() })
    route.addNode(nodos[6][4], { 'FE': num_rand(), 'GD': num_rand(), 'GF': num_rand(), 'HE': num_rand() })
    route.addNode(nodos[6][5], { 'FF': num_rand(), 'GE': num_rand(), 'GG': num_rand(), 'HF': num_rand() })
    route.addNode(nodos[6][6], { 'FG': num_rand(), 'GF': num_rand(), 'GH': num_rand(), 'HG': num_rand() })
    route.addNode(nodos[6][7], { 'FH': num_rand(), 'GG': num_rand(), 'GI': num_rand(), 'HH': num_rand() })
    route.addNode(nodos[6][8], { 'FI': num_rand(), 'GH': num_rand(), 'GJ': num_rand(), 'HI': num_rand() })
    route.addNode(nodos[6][9], { 'FJ': num_rand(), 'GI': num_rand(), 'GK': num_rand(), 'HJ': num_rand() })
    route.addNode(nodos[6][10], { 'FK': num_rand(), 'GJ': num_rand(), 'GL': num_rand(), 'HK': num_rand() })
    route.addNode(nodos[6][11], { 'FL': num_rand(), 'GK': num_rand(), 'GM': num_rand(), 'HL': num_rand() })
    route.addNode(nodos[6][12], { 'FM': num_rand(), 'GL': num_rand(), 'GN': num_rand(), 'HM': num_rand() })
    route.addNode(nodos[6][13], { 'FN': num_rand(), 'GM': num_rand(), 'GO': num_rand(), 'HN': num_rand() })
    route.addNode(nodos[6][14], { 'FO': num_rand(), 'GN': num_rand(), 'GP': num_rand(), 'HO': num_rand() })
    route.addNode(nodos[6][15], { 'FP': num_rand(), 'GO': num_rand(), 'GQ': num_rand(), 'HP': num_rand() })
    route.addNode(nodos[6][16], { 'FQ': num_rand(), 'GP': num_rand(), 'GR': num_rand(), 'HQ': num_rand() })
    route.addNode(nodos[6][17], { 'FR': num_rand(), 'GQ': num_rand(), 'GS': num_rand(), 'HR': num_rand() })
    route.addNode(nodos[6][18], { 'FS': num_rand(), 'GR': num_rand(), 'GT': num_rand(), 'HS': num_rand() })
    route.addNode(nodos[6][19], { 'FT': num_rand(), 'GS': num_rand(), 'HT': num_rand() })
    //COLUMNA H
    route.addNode(nodos[7][0], { 'GA': num_rand(), 'HB': num_rand(), 'IA': num_rand() })
    route.addNode(nodos[7][1], { 'GB': num_rand(), 'HA': num_rand(), 'HC': num_rand(), 'IB': num_rand(), })
    route.addNode(nodos[7][2], { 'GC': num_rand(), 'HB': num_rand(), 'HD': num_rand(), 'IC': num_rand(), })
    route.addNode(nodos[7][3], { 'GD': num_rand(), 'HC': num_rand(), 'HE': num_rand(), 'ID': num_rand(), })
    route.addNode(nodos[7][4], { 'GE': num_rand(), 'HD': num_rand(), 'HF': num_rand(), 'IE': num_rand(), })
    route.addNode(nodos[7][5], { 'GF': num_rand(), 'HE': num_rand(), 'HG': num_rand(), 'IF': num_rand(), })
    route.addNode(nodos[7][6], { 'GG': num_rand(), 'HF': num_rand(), 'HH': num_rand(), 'IG': num_rand(), })
    route.addNode(nodos[7][7], { 'GH': num_rand(), 'HG': num_rand(), 'HI': num_rand(), 'IH': num_rand(), })
    route.addNode(nodos[7][8], { 'GI': num_rand(), 'HH': num_rand(), 'HJ': num_rand(), 'II': num_rand(), })
    route.addNode(nodos[7][9], { 'GJ': num_rand(), 'HI': num_rand(), 'HK': num_rand(), 'IJ': num_rand(), })
    route.addNode(nodos[7][10], { 'GK': num_rand(), 'HJ': num_rand(), 'HL': num_rand(), 'IK': num_rand(), })
    route.addNode(nodos[7][11], { 'GL': num_rand(), 'HK': num_rand(), 'HM': num_rand(), 'IL': num_rand(), })
    route.addNode(nodos[7][12], { 'GM': num_rand(), 'HL': num_rand(), 'HN': num_rand(), 'IM': num_rand(), })
    route.addNode(nodos[7][13], { 'GN': num_rand(), 'HM': num_rand(), 'HO': num_rand(), 'IN': num_rand(), })
    route.addNode(nodos[7][14], { 'GO': num_rand(), 'HN': num_rand(), 'HP': num_rand(), 'IO': num_rand(), })
    route.addNode(nodos[7][15], { 'GP': num_rand(), 'HO': num_rand(), 'HQ': num_rand(), 'IP': num_rand(), })
    route.addNode(nodos[7][16], { 'GQ': num_rand(), 'HP': num_rand(), 'HR': num_rand(), 'IQ': num_rand(), })
    route.addNode(nodos[7][17], { 'GR': num_rand(), 'HQ': num_rand(), 'HS': num_rand(), 'IR': num_rand(), })
    route.addNode(nodos[7][18], { 'GS': num_rand(), 'HR': num_rand(), 'HT': num_rand(), 'IS': num_rand(), })
    route.addNode(nodos[7][19], { 'GT': num_rand(), 'HS': num_rand(), 'IT': num_rand() })
    //COLUMNA I
    route.addNode(nodos[8][0], { 'HA': num_rand(), 'IB': num_rand(), 'JA': num_rand() })
    route.addNode(nodos[8][1], { 'HB': num_rand(), 'IA': num_rand(), 'IC': num_rand(), 'JB': num_rand() })
    route.addNode(nodos[8][2], { 'HC': num_rand(), 'IB': num_rand(), 'ID': num_rand(), 'JC': num_rand() })
    route.addNode(nodos[8][3], { 'HD': num_rand(), 'IC': num_rand(), 'IE': num_rand(), 'JD': num_rand() })
    route.addNode(nodos[8][4], { 'HE': num_rand(), 'ID': num_rand(), 'IF': num_rand(), 'JE': num_rand() })
    route.addNode(nodos[8][5], { 'HF': num_rand(), 'IE': num_rand(), 'IG': num_rand(), 'JF': num_rand() })
    route.addNode(nodos[8][6], { 'HG': num_rand(), 'IF': num_rand(), 'IH': num_rand(), 'JG': num_rand() })
    route.addNode(nodos[8][7], { 'HH': num_rand(), 'IG': num_rand(), 'II': num_rand(), 'JH': num_rand() })
    route.addNode(nodos[8][8], { 'HI': num_rand(), 'IH': num_rand(), 'IJ': num_rand(), 'JI': num_rand() })
    route.addNode(nodos[8][9], { 'HJ': num_rand(), 'II': num_rand(), 'IK': num_rand(), 'JJ': num_rand() })
    route.addNode(nodos[8][10], { 'HK': num_rand(), 'IJ': num_rand(), 'IL': num_rand(), 'JK': num_rand() })
    route.addNode(nodos[8][11], { 'HL': num_rand(), 'IK': num_rand(), 'IM': num_rand(), 'JL': num_rand() })
    route.addNode(nodos[8][12], { 'HM': num_rand(), 'IL': num_rand(), 'IN': num_rand(), 'JM': num_rand() })
    route.addNode(nodos[8][13], { 'HN': num_rand(), 'IM': num_rand(), 'IO': num_rand(), 'JN': num_rand() })
    route.addNode(nodos[8][14], { 'HO': num_rand(), 'IN': num_rand(), 'IP': num_rand(), 'JO': num_rand() })
    route.addNode(nodos[8][15], { 'HP': num_rand(), 'IO': num_rand(), 'IQ': num_rand(), 'JP': num_rand() })
    route.addNode(nodos[8][16], { 'HQ': num_rand(), 'IP': num_rand(), 'IR': num_rand(), 'JQ': num_rand() })
    route.addNode(nodos[8][17], { 'HR': num_rand(), 'IQ': num_rand(), 'IS': num_rand(), 'JR': num_rand() })
    route.addNode(nodos[8][18], { 'HS': num_rand(), 'IR': num_rand(), 'IT': num_rand(), 'JS': num_rand() })
    route.addNode(nodos[8][19], { 'HT': num_rand(), 'IS': num_rand(), 'JT': num_rand() })
    //COLUMNA J
    route.addNode(nodos[9][0], { 'IA': num_rand(), 'JB': num_rand(), 'KA': num_rand() })
    route.addNode(nodos[9][1], { 'IB': num_rand(), 'JA': num_rand(), 'JC': num_rand(), 'KB': num_rand() })
    route.addNode(nodos[9][2], { 'IC': num_rand(), 'JB': num_rand(), 'JD': num_rand(), 'KC': num_rand() })
    route.addNode(nodos[9][3], { 'ID': num_rand(), 'JC': num_rand(), 'JE': num_rand(), 'KD': num_rand() })
    route.addNode(nodos[9][4], { 'IE': num_rand(), 'JD': num_rand(), 'JF': num_rand(), 'KE': num_rand() })
    route.addNode(nodos[9][5], { 'IF': num_rand(), 'JE': num_rand(), 'JG': num_rand(), 'KF': num_rand() })
    route.addNode(nodos[9][6], { 'IG': num_rand(), 'JF': num_rand(), 'JH': num_rand(), 'KG': num_rand() })
    route.addNode(nodos[9][7], { 'IH': num_rand(), 'JG': num_rand(), 'JI': num_rand(), 'KH': num_rand() })
    route.addNode(nodos[9][8], { 'II': num_rand(), 'JH': num_rand(), 'JJ': num_rand(), 'KI': num_rand() })
    route.addNode(nodos[9][9], { 'IJ': num_rand(), 'JI': num_rand(), 'JK': num_rand(), 'KJ': num_rand() })
    route.addNode(nodos[9][10], { 'IK': num_rand(), 'JJ': num_rand(), 'JL': num_rand(), 'KK': num_rand() })
    route.addNode(nodos[9][11], { 'IL': num_rand(), 'JK': num_rand(), 'JM': num_rand(), 'KL': num_rand() })
    route.addNode(nodos[9][12], { 'IM': num_rand(), 'JL': num_rand(), 'JN': num_rand(), 'KM': num_rand() })
    route.addNode(nodos[9][13], { 'IN': num_rand(), 'JM': num_rand(), 'JO': num_rand(), 'KN': num_rand() })
    route.addNode(nodos[9][14], { 'IO': num_rand(), 'JN': num_rand(), 'JP': num_rand(), 'KO': num_rand() })
    route.addNode(nodos[9][15], { 'IP': num_rand(), 'JO': num_rand(), 'JQ': num_rand(), 'KP': num_rand() })
    route.addNode(nodos[9][16], { 'IQ': num_rand(), 'JP': num_rand(), 'JR': num_rand(), 'KQ': num_rand() })
    route.addNode(nodos[9][17], { 'IR': num_rand(), 'JQ': num_rand(), 'JS': num_rand(), 'KR': num_rand() })
    route.addNode(nodos[9][18], { 'IS': num_rand(), 'JR': num_rand(), 'JT': num_rand(), 'KS': num_rand() })
    route.addNode(nodos[9][19], { 'IT': num_rand(), 'JS': num_rand(), 'KT': num_rand() })
    //COLUMNA K
    route.addNode(nodos[10][0], { 'JA': num_rand(), 'KB': num_rand(), 'LA': num_rand() })
    route.addNode(nodos[10][1], { 'JB': num_rand(), 'KA': num_rand(), 'KC': num_rand(), 'LB': num_rand() })
    route.addNode(nodos[10][2], { 'JC': num_rand(), 'KB': num_rand(), 'KD': num_rand(), 'LC': num_rand() })
    route.addNode(nodos[10][3], { 'JD': num_rand(), 'KC': num_rand(), 'KE': num_rand(), 'LD': num_rand() })
    route.addNode(nodos[10][4], { 'JE': num_rand(), 'KD': num_rand(), 'KF': num_rand(), 'LE': num_rand() })
    route.addNode(nodos[10][5], { 'JF': num_rand(), 'KE': num_rand(), 'KG': num_rand(), 'LF': num_rand() })
    route.addNode(nodos[10][6], { 'JG': num_rand(), 'KF': num_rand(), 'KH': num_rand(), 'LG': num_rand() })
    route.addNode(nodos[10][7], { 'JH': num_rand(), 'KG': num_rand(), 'KI': num_rand(), 'LH': num_rand() })
    route.addNode(nodos[10][8], { 'JI': num_rand(), 'KH': num_rand(), 'KJ': num_rand(), 'LI': num_rand() })
    route.addNode(nodos[10][9], { 'JJ': num_rand(), 'KI': num_rand(), 'KK': num_rand(), 'LJ': num_rand() })
    route.addNode(nodos[10][10], { 'JK': num_rand(), 'KJ': num_rand(), 'KL': num_rand(), 'LK': num_rand() })
    route.addNode(nodos[10][11], { 'JL': num_rand(), 'KK': num_rand(), 'KM': num_rand(), 'LL': num_rand() })
    route.addNode(nodos[10][12], { 'JM': num_rand(), 'KL': num_rand(), 'KN': num_rand(), 'LM': num_rand() })
    route.addNode(nodos[10][13], { 'JN': num_rand(), 'KM': num_rand(), 'KO': num_rand(), 'LN': num_rand() })
    route.addNode(nodos[10][14], { 'JO': num_rand(), 'KN': num_rand(), 'KP': num_rand(), 'LO': num_rand() })
    route.addNode(nodos[10][15], { 'JP': num_rand(), 'KO': num_rand(), 'KQ': num_rand(), 'LP': num_rand() })
    route.addNode(nodos[10][16], { 'JQ': num_rand(), 'KP': num_rand(), 'KR': num_rand(), 'LQ': num_rand() })
    route.addNode(nodos[10][17], { 'JR': num_rand(), 'KQ': num_rand(), 'KS': num_rand(), 'LR': num_rand() })
    route.addNode(nodos[10][18], { 'JS': num_rand(), 'KR': num_rand(), 'KT': num_rand(), 'LS': num_rand() })
    route.addNode(nodos[10][19], { 'JT': num_rand(), 'KS': num_rand(), 'LT': num_rand() })
    //COLUMNA L
    route.addNode(nodos[11][0], { 'KA': num_rand(), 'LB': num_rand(), 'MA': num_rand() })
    route.addNode(nodos[11][1], { 'KB': num_rand(), 'LA': num_rand(), 'LC': num_rand(), 'MB': num_rand() })
    route.addNode(nodos[11][2], { 'KC': num_rand(), 'LB': num_rand(), 'LD': num_rand(), 'MC': num_rand() })
    route.addNode(nodos[11][3], { 'KD': num_rand(), 'LC': num_rand(), 'LE': num_rand(), 'MD': num_rand() })
    route.addNode(nodos[11][4], { 'KE': num_rand(), 'LD': num_rand(), 'LF': num_rand(), 'ME': num_rand() })
    route.addNode(nodos[11][5], { 'KF': num_rand(), 'LE': num_rand(), 'LG': num_rand(), 'MF': num_rand() })
    route.addNode(nodos[11][6], { 'KG': num_rand(), 'LF': num_rand(), 'LH': num_rand(), 'MG': num_rand() })
    route.addNode(nodos[11][7], { 'KH': num_rand(), 'LG': num_rand(), 'LI': num_rand(), 'MH': num_rand() })
    route.addNode(nodos[11][8], { 'KI': num_rand(), 'LH': num_rand(), 'LJ': num_rand(), 'MI': num_rand() })
    route.addNode(nodos[11][9], { 'KJ': num_rand(), 'LI': num_rand(), 'LK': num_rand(), 'MJ': num_rand() })
    route.addNode(nodos[11][10], { 'KK': num_rand(), 'LJ': num_rand(), 'LL': num_rand(), 'MK': num_rand() })
    route.addNode(nodos[11][11], { 'KL': num_rand(), 'LK': num_rand(), 'LM': num_rand(), 'ML': num_rand() })
    route.addNode(nodos[11][12], { 'KM': num_rand(), 'LL': num_rand(), 'LN': num_rand(), 'MM': num_rand() })
    route.addNode(nodos[11][13], { 'KN': num_rand(), 'LM': num_rand(), 'LO': num_rand(), 'MN': num_rand() })
    route.addNode(nodos[11][14], { 'KO': num_rand(), 'LN': num_rand(), 'LP': num_rand(), 'MO': num_rand() })
    route.addNode(nodos[11][15], { 'KP': num_rand(), 'LO': num_rand(), 'LQ': num_rand(), 'MP': num_rand() })
    route.addNode(nodos[11][16], { 'KQ': num_rand(), 'LP': num_rand(), 'LR': num_rand(), 'MQ': num_rand() })
    route.addNode(nodos[11][17], { 'KR': num_rand(), 'LQ': num_rand(), 'LS': num_rand(), 'MR': num_rand() })
    route.addNode(nodos[11][18], { 'KS': num_rand(), 'LR': num_rand(), 'LT': num_rand(), 'MS': num_rand() })
    route.addNode(nodos[11][19], { 'KT': num_rand(), 'LS': num_rand(), 'MT': num_rand() })
    //COLUMNA M
    route.addNode(nodos[12][0], { 'LA': num_rand(), 'MB': num_rand(), 'NA': num_rand() })
    route.addNode(nodos[12][1], { 'LB': num_rand(), 'MA': num_rand(), 'MC': num_rand(), 'NB': num_rand() })
    route.addNode(nodos[12][2], { 'LC': num_rand(), 'MB': num_rand(), 'MD': num_rand(), 'NC': num_rand() })
    route.addNode(nodos[12][3], { 'LD': num_rand(), 'MC': num_rand(), 'ME': num_rand(), 'ND': num_rand() })
    route.addNode(nodos[12][4], { 'LE': num_rand(), 'MD': num_rand(), 'MF': num_rand(), 'NE': num_rand() })
    route.addNode(nodos[12][5], { 'LF': num_rand(), 'ME': num_rand(), 'MG': num_rand(), 'NF': num_rand() })
    route.addNode(nodos[12][6], { 'LG': num_rand(), 'MF': num_rand(), 'MH': num_rand(), 'NG': num_rand() })
    route.addNode(nodos[12][7], { 'LH': num_rand(), 'MG': num_rand(), 'MI': num_rand(), 'NH': num_rand() })
    route.addNode(nodos[12][8], { 'LI': num_rand(), 'MH': num_rand(), 'MJ': num_rand(), 'NI': num_rand() })
    route.addNode(nodos[12][9], { 'LJ': num_rand(), 'MI': num_rand(), 'MK': num_rand(), 'NJ': num_rand() })
    route.addNode(nodos[12][10], { 'LK': num_rand(), 'MJ': num_rand(), 'ML': num_rand(), 'NK': num_rand() })
    route.addNode(nodos[12][11], { 'LL': num_rand(), 'MK': num_rand(), 'MM': num_rand(), 'NL': num_rand() })
    route.addNode(nodos[12][12], { 'LM': num_rand(), 'ML': num_rand(), 'MN': num_rand(), 'NM': num_rand() })
    route.addNode(nodos[12][13], { 'LN': num_rand(), 'MM': num_rand(), 'MO': num_rand(), 'NN': num_rand() })
    route.addNode(nodos[12][14], { 'LO': num_rand(), 'MN': num_rand(), 'MP': num_rand(), 'NO': num_rand() })
    route.addNode(nodos[12][15], { 'LP': num_rand(), 'MO': num_rand(), 'MQ': num_rand(), 'NP': num_rand() })
    route.addNode(nodos[12][16], { 'LQ': num_rand(), 'MP': num_rand(), 'MR': num_rand(), 'NQ': num_rand() })
    route.addNode(nodos[12][17], { 'LR': num_rand(), 'MQ': num_rand(), 'MS': num_rand(), 'NR': num_rand() })
    route.addNode(nodos[12][18], { 'LS': num_rand(), 'MR': num_rand(), 'MT': num_rand(), 'NS': num_rand() })
    route.addNode(nodos[12][19], { 'LT': num_rand(), 'MS': num_rand(), 'NT': num_rand() })
    //COLUMNA N
    route.addNode(nodos[13][0], { 'MA': num_rand(), 'NB': num_rand(), 'OA': num_rand() })
    route.addNode(nodos[13][1], { 'MB': num_rand(), 'NA': num_rand(), 'NC': num_rand(), 'OB': num_rand() })
    route.addNode(nodos[13][2], { 'MC': num_rand(), 'NB': num_rand(), 'ND': num_rand(), 'OC': num_rand() })
    route.addNode(nodos[13][3], { 'MD': num_rand(), 'NC': num_rand(), 'NE': num_rand(), 'OD': num_rand() })
    route.addNode(nodos[13][4], { 'ME': num_rand(), 'ND': num_rand(), 'NF': num_rand(), 'OE': num_rand() })
    route.addNode(nodos[13][5], { 'MF': num_rand(), 'NE': num_rand(), 'NG': num_rand(), 'OF': num_rand() })
    route.addNode(nodos[13][6], { 'MG': num_rand(), 'NF': num_rand(), 'NH': num_rand(), 'OG': num_rand() })
    route.addNode(nodos[13][7], { 'MH': num_rand(), 'NG': num_rand(), 'NI': num_rand(), 'OH': num_rand() })
    route.addNode(nodos[13][8], { 'MI': num_rand(), 'NH': num_rand(), 'NJ': num_rand(), 'OI': num_rand() })
    route.addNode(nodos[13][9], { 'MJ': num_rand(), 'NI': num_rand(), 'NK': num_rand(), 'OJ': num_rand() })
    route.addNode(nodos[13][10], { 'MK': num_rand(), 'NJ': num_rand(), 'NL': num_rand(), 'OK': num_rand() })
    route.addNode(nodos[13][11], { 'ML': num_rand(), 'NK': num_rand(), 'NM': num_rand(), 'OL': num_rand() })
    route.addNode(nodos[13][12], { 'MM': num_rand(), 'NL': num_rand(), 'NN': num_rand(), 'OM': num_rand() })
    route.addNode(nodos[13][13], { 'MN': num_rand(), 'NM': num_rand(), 'NO': num_rand(), 'ON': num_rand() })
    route.addNode(nodos[13][14], { 'MO': num_rand(), 'NN': num_rand(), 'NP': num_rand(), 'OO': num_rand() })
    route.addNode(nodos[13][15], { 'MP': num_rand(), 'NO': num_rand(), 'NQ': num_rand(), 'OP': num_rand() })
    route.addNode(nodos[13][16], { 'MQ': num_rand(), 'NP': num_rand(), 'NR': num_rand(), 'OQ': num_rand() })
    route.addNode(nodos[13][17], { 'MR': num_rand(), 'NQ': num_rand(), 'NS': num_rand(), 'OR': num_rand() })
    route.addNode(nodos[13][18], { 'MS': num_rand(), 'NR': num_rand(), 'NT': num_rand(), 'OS': num_rand() })
    route.addNode(nodos[13][19], { 'MT': num_rand(), 'NS': num_rand(), 'OT': num_rand() })
    //COLUMNA O
    route.addNode(nodos[14][0], { 'NA': num_rand(), 'OB': num_rand(), 'PA': num_rand() })
    route.addNode(nodos[14][1], { 'NB': num_rand(), 'OA': num_rand(), 'OC': num_rand(), 'PB': num_rand() })
    route.addNode(nodos[14][2], { 'NC': num_rand(), 'OB': num_rand(), 'OD': num_rand(), 'PC': num_rand() })
    route.addNode(nodos[14][3], { 'ND': num_rand(), 'OC': num_rand(), 'OE': num_rand(), 'PD': num_rand() })
    route.addNode(nodos[14][4], { 'NE': num_rand(), 'OD': num_rand(), 'OF': num_rand(), 'PE': num_rand() })
    route.addNode(nodos[14][5], { 'NF': num_rand(), 'OE': num_rand(), 'OG': num_rand(), 'PF': num_rand() })
    route.addNode(nodos[14][6], { 'NG': num_rand(), 'OF': num_rand(), 'OH': num_rand(), 'PG': num_rand() })
    route.addNode(nodos[14][7], { 'NH': num_rand(), 'OG': num_rand(), 'OI': num_rand(), 'PH': num_rand() })
    route.addNode(nodos[14][8], { 'NI': num_rand(), 'OH': num_rand(), 'OJ': num_rand(), 'PI': num_rand() })
    route.addNode(nodos[14][9], { 'NJ': num_rand(), 'OI': num_rand(), 'OK': num_rand(), 'PJ': num_rand() })
    route.addNode(nodos[14][10], { 'NK': num_rand(), 'OJ': num_rand(), 'OL': num_rand(), 'PK': num_rand() })
    route.addNode(nodos[14][11], { 'NL': num_rand(), 'OK': num_rand(), 'OM': num_rand(), 'PL': num_rand() })
    route.addNode(nodos[14][12], { 'NM': num_rand(), 'OL': num_rand(), 'ON': num_rand(), 'PM': num_rand() })
    route.addNode(nodos[14][13], { 'NN': num_rand(), 'OM': num_rand(), 'OI': num_rand(), 'PN': num_rand() })
    route.addNode(nodos[14][14], { 'NO': num_rand(), 'ON': num_rand(), 'OP': num_rand(), 'PO': num_rand() })
    route.addNode(nodos[14][15], { 'NP': num_rand(), 'OO': num_rand(), 'OQ': num_rand(), 'PP': num_rand() })
    route.addNode(nodos[14][16], { 'NQ': num_rand(), 'OP': num_rand(), 'OR': num_rand(), 'PQ': num_rand() })
    route.addNode(nodos[14][17], { 'NR': num_rand(), 'OQ': num_rand(), 'OS': num_rand(), 'PR': num_rand() })
    route.addNode(nodos[14][18], { 'NS': num_rand(), 'OR': num_rand(), 'OT': num_rand(), 'PS': num_rand() })
    route.addNode(nodos[14][19], { 'NT': num_rand(), 'OS': num_rand(), 'PT': num_rand() })
    //COLUMNA P
    route.addNode(nodos[15][0], { 'OA': num_rand(), 'PB': num_rand(), 'QA': num_rand() })
    route.addNode(nodos[15][1], { 'OB': num_rand(), 'PA': num_rand(), 'PC': num_rand(), 'QB': num_rand() })
    route.addNode(nodos[15][2], { 'OC': num_rand(), 'PB': num_rand(), 'PD': num_rand(), 'QC': num_rand() })
    route.addNode(nodos[15][3], { 'OD': num_rand(), 'PC': num_rand(), 'PE': num_rand(), 'QD': num_rand() })
    route.addNode(nodos[15][4], { 'OE': num_rand(), 'PD': num_rand(), 'PF': num_rand(), 'QE': num_rand() })
    route.addNode(nodos[15][5], { 'OF': num_rand(), 'PE': num_rand(), 'PG': num_rand(), 'QF': num_rand() })
    route.addNode(nodos[15][6], { 'OG': num_rand(), 'PF': num_rand(), 'PH': num_rand(), 'QG': num_rand() })
    route.addNode(nodos[15][7], { 'OH': num_rand(), 'PG': num_rand(), 'PI': num_rand(), 'QH': num_rand() })
    route.addNode(nodos[15][8], { 'OI': num_rand(), 'PH': num_rand(), 'PJ': num_rand(), 'QI': num_rand() })
    route.addNode(nodos[15][9], { 'OJ': num_rand(), 'PI': num_rand(), 'PK': num_rand(), 'QJ': num_rand() })
    route.addNode(nodos[15][10], { 'OK': num_rand(), 'PJ': num_rand(), 'PL': num_rand(), 'QK': num_rand() })
    route.addNode(nodos[15][11], { 'OL': num_rand(), 'PK': num_rand(), 'PM': num_rand(), 'QL': num_rand() })
    route.addNode(nodos[15][12], { 'OM': num_rand(), 'PL': num_rand(), 'PN': num_rand(), 'QM': num_rand() })
    route.addNode(nodos[15][13], { 'ON': num_rand(), 'PM': num_rand(), 'PO': num_rand(), 'QN': num_rand() })
    route.addNode(nodos[15][14], { 'OO': num_rand(), 'PN': num_rand(), 'PP': num_rand(), 'QO': num_rand() })
    route.addNode(nodos[15][15], { 'OP': num_rand(), 'PO': num_rand(), 'PQ': num_rand(), 'QP': num_rand() })
    route.addNode(nodos[15][16], { 'OQ': num_rand(), 'PP': num_rand(), 'PR': num_rand(), 'QQ': num_rand() })
    route.addNode(nodos[15][17], { 'OR': num_rand(), 'PQ': num_rand(), 'PS': num_rand(), 'QR': num_rand() })
    route.addNode(nodos[15][18], { 'OS': num_rand(), 'PR': num_rand(), 'PT': num_rand(), 'QS': num_rand() })
    route.addNode(nodos[15][19], { 'OT': num_rand(), 'PS': num_rand(), 'QT': num_rand() })
    //COLUMNA Q
    route.addNode(nodos[16][0], { 'PA': num_rand(), 'QB': num_rand(), 'RA': num_rand() })
    route.addNode(nodos[16][1], { 'PB': num_rand(), 'QA': num_rand(), 'QC': num_rand(), 'RB': num_rand() })
    route.addNode(nodos[16][2], { 'PC': num_rand(), 'QB': num_rand(), 'QD': num_rand(), 'RC': num_rand() })
    route.addNode(nodos[16][3], { 'PD': num_rand(), 'QC': num_rand(), 'QE': num_rand(), 'RD': num_rand() })
    route.addNode(nodos[16][4], { 'PE': num_rand(), 'QD': num_rand(), 'QF': num_rand(), 'RE': num_rand() })
    route.addNode(nodos[16][5], { 'PF': num_rand(), 'QE': num_rand(), 'QG': num_rand(), 'RF': num_rand() })
    route.addNode(nodos[16][6], { 'PG': num_rand(), 'QF': num_rand(), 'QH': num_rand(), 'RG': num_rand() })
    route.addNode(nodos[16][7], { 'PH': num_rand(), 'QG': num_rand(), 'QI': num_rand(), 'RH': num_rand() })
    route.addNode(nodos[16][8], { 'PI': num_rand(), 'QH': num_rand(), 'QJ': num_rand(), 'RI': num_rand() })
    route.addNode(nodos[16][9], { 'PJ': num_rand(), 'QI': num_rand(), 'QK': num_rand(), 'RJ': num_rand() })
    route.addNode(nodos[16][10], { 'PK': num_rand(), 'QJ': num_rand(), 'QL': num_rand(), 'RK': num_rand() })
    route.addNode(nodos[16][11], { 'PL': num_rand(), 'QK': num_rand(), 'QM': num_rand(), 'RL': num_rand() })
    route.addNode(nodos[16][12], { 'PM': num_rand(), 'QL': num_rand(), 'QN': num_rand(), 'RM': num_rand() })
    route.addNode(nodos[16][13], { 'PN': num_rand(), 'QM': num_rand(), 'QO': num_rand(), 'RN': num_rand() })
    route.addNode(nodos[16][14], { 'PO': num_rand(), 'QN': num_rand(), 'QP': num_rand(), 'RO': num_rand() })
    route.addNode(nodos[16][15], { 'PP': num_rand(), 'QO': num_rand(), 'QQ': num_rand(), 'RP': num_rand() })
    route.addNode(nodos[16][16], { 'PQ': num_rand(), 'QP': num_rand(), 'QR': num_rand(), 'RQ': num_rand() })
    route.addNode(nodos[16][17], { 'PR': num_rand(), 'QQ': num_rand(), 'QS': num_rand(), 'RR': num_rand() })
    route.addNode(nodos[16][18], { 'PS': num_rand(), 'QR': num_rand(), 'QT': num_rand(), 'RS': num_rand() })
    route.addNode(nodos[16][19], { 'PT': num_rand(), 'PS': num_rand(), 'PT': num_rand() })
    //COLUMNA R
    route.addNode(nodos[17][0], { 'PA': num_rand(), 'QB': num_rand(), 'RA': num_rand() })
    route.addNode(nodos[17][1], { 'PB': num_rand(), 'QA': num_rand(), 'QC': num_rand(), 'RB': num_rand() })
    route.addNode(nodos[17][2], { 'PC': num_rand(), 'QB': num_rand(), 'QD': num_rand(), 'RC': num_rand() })
    route.addNode(nodos[17][3], { 'PD': num_rand(), 'QC': num_rand(), 'QE': num_rand(), 'RD': num_rand() })
    route.addNode(nodos[17][4], { 'PE': num_rand(), 'QD': num_rand(), 'QF': num_rand(), 'RE': num_rand() })
    route.addNode(nodos[17][5], { 'PF': num_rand(), 'QE': num_rand(), 'QG': num_rand(), 'RF': num_rand() })
    route.addNode(nodos[17][6], { 'PG': num_rand(), 'QF': num_rand(), 'QH': num_rand(), 'RG': num_rand() })
    route.addNode(nodos[17][7], { 'PH': num_rand(), 'QG': num_rand(), 'QI': num_rand(), 'RH': num_rand() })
    route.addNode(nodos[17][8], { 'PI': num_rand(), 'QH': num_rand(), 'QJ': num_rand(), 'RI': num_rand() })
    route.addNode(nodos[17][9], { 'PJ': num_rand(), 'QI': num_rand(), 'QK': num_rand(), 'RJ': num_rand() })
    route.addNode(nodos[17][10], { 'PK': num_rand(), 'QJ': num_rand(), 'QL': num_rand(), 'RK': num_rand() })
    route.addNode(nodos[17][11], { 'PL': num_rand(), 'QK': num_rand(), 'QM': num_rand(), 'RL': num_rand() })
    route.addNode(nodos[17][12], { 'PM': num_rand(), 'QL': num_rand(), 'QN': num_rand(), 'RM': num_rand() })
    route.addNode(nodos[17][13], { 'PN': num_rand(), 'QM': num_rand(), 'QO': num_rand(), 'RN': num_rand() })
    route.addNode(nodos[17][14], { 'PO': num_rand(), 'QN': num_rand(), 'QP': num_rand(), 'RO': num_rand() })
    route.addNode(nodos[17][15], { 'PP': num_rand(), 'QO': num_rand(), 'QQ': num_rand(), 'RP': num_rand() })
    route.addNode(nodos[17][16], { 'PQ': num_rand(), 'QP': num_rand(), 'QR': num_rand(), 'RQ': num_rand() })
    route.addNode(nodos[17][17], { 'PR': num_rand(), 'QQ': num_rand(), 'QS': num_rand(), 'RR': num_rand() })
    route.addNode(nodos[17][18], { 'PS': num_rand(), 'QR': num_rand(), 'QT': num_rand(), 'RS': num_rand() })
    route.addNode(nodos[17][19], { 'PT': num_rand(), 'QS': num_rand(), 'RT': num_rand() })
    //COLUMNA S
    route.addNode(nodos[18][0], { 'QA': num_rand(), 'RB': num_rand(), 'SA': num_rand() })
    route.addNode(nodos[18][1], { 'QB': num_rand(), 'RA': num_rand(), 'RC': num_rand(), 'SB': num_rand() })
    route.addNode(nodos[18][2], { 'QC': num_rand(), 'RB': num_rand(), 'RD': num_rand(), 'SC': num_rand() })
    route.addNode(nodos[18][3], { 'QD': num_rand(), 'RC': num_rand(), 'RE': num_rand(), 'SD': num_rand() })
    route.addNode(nodos[18][4], { 'QE': num_rand(), 'RD': num_rand(), 'RF': num_rand(), 'SE': num_rand() })
    route.addNode(nodos[18][5], { 'QF': num_rand(), 'RE': num_rand(), 'RG': num_rand(), 'SF': num_rand() })
    route.addNode(nodos[18][6], { 'QG': num_rand(), 'RF': num_rand(), 'RH': num_rand(), 'SG': num_rand() })
    route.addNode(nodos[18][7], { 'QH': num_rand(), 'RG': num_rand(), 'RI': num_rand(), 'SH': num_rand() })
    route.addNode(nodos[18][8], { 'QI': num_rand(), 'RH': num_rand(), 'RJ': num_rand(), 'SI': num_rand() })
    route.addNode(nodos[18][9], { 'QJ': num_rand(), 'RI': num_rand(), 'RK': num_rand(), 'SJ': num_rand() })
    route.addNode(nodos[18][10], { 'QK': num_rand(), 'RJ': num_rand(), 'RL': num_rand(), 'SK': num_rand() })
    route.addNode(nodos[18][11], { 'QL': num_rand(), 'RK': num_rand(), 'RM': num_rand(), 'SL': num_rand() })
    route.addNode(nodos[18][12], { 'QM': num_rand(), 'RL': num_rand(), 'RN': num_rand(), 'SM': num_rand() })
    route.addNode(nodos[18][13], { 'QN': num_rand(), 'RM': num_rand(), 'RO': num_rand(), 'SN': num_rand() })
    route.addNode(nodos[18][14], { 'QO': num_rand(), 'RN': num_rand(), 'RP': num_rand(), 'SO': num_rand() })
    route.addNode(nodos[18][15], { 'QP': num_rand(), 'RO': num_rand(), 'RQ': num_rand(), 'SP': num_rand() })
    route.addNode(nodos[18][16], { 'QQ': num_rand(), 'RP': num_rand(), 'RR': num_rand(), 'SQ': num_rand() })
    route.addNode(nodos[18][17], { 'QR': num_rand(), 'RQ': num_rand(), 'RS': num_rand(), 'SR': num_rand() })
    route.addNode(nodos[18][18], { 'QS': num_rand(), 'RR': num_rand(), 'RT': num_rand(), 'SS': num_rand() })
    route.addNode(nodos[18][19], { 'QT': num_rand(), 'RS': num_rand(), 'ST': num_rand() })
    //COLUMNA T
    route.addNode(nodos[19][0], { 'SA': num_rand(), 'TB': num_rand() })
    route.addNode(nodos[19][1], { 'TA': num_rand(), 'TC': num_rand(), 'SB': num_rand() })
    route.addNode(nodos[19][2], { 'TB': num_rand(), 'TD': num_rand(), 'SC': num_rand() })
    route.addNode(nodos[19][3], { 'TC': num_rand(), 'TE': num_rand(), 'SD': num_rand() })
    route.addNode(nodos[19][4], { 'TD': num_rand(), 'TF': num_rand(), 'SE': num_rand() })
    route.addNode(nodos[19][5], { 'TE': num_rand(), 'TG': num_rand(), 'SF': num_rand() })
    route.addNode(nodos[19][6], { 'TF': num_rand(), 'TH': num_rand(), 'SG': num_rand() })
    route.addNode(nodos[19][7], { 'TG': num_rand(), 'TI': num_rand(), 'SH': num_rand() })
    route.addNode(nodos[19][8], { 'TH': num_rand(), 'TJ': num_rand(), 'SI': num_rand() })
    route.addNode(nodos[19][9], { 'TI': num_rand(), 'TK': num_rand(), 'SJ': num_rand() })
    route.addNode(nodos[19][10], { 'TJ': num_rand(), 'TL': num_rand(), 'SK': num_rand() })
    route.addNode(nodos[19][11], { 'TK': num_rand(), 'TM': num_rand(), 'SL': num_rand() })
    route.addNode(nodos[19][12], { 'TL': num_rand(), 'TN': num_rand(), 'SM': num_rand() })
    route.addNode(nodos[19][13], { 'TM': num_rand(), 'TO': num_rand(), 'SN': num_rand() })
    route.addNode(nodos[19][14], { 'TN': num_rand(), 'TP': num_rand(), 'SO': num_rand() })
    route.addNode(nodos[19][15], { 'TO': num_rand(), 'TQ': num_rand(), 'SP': num_rand() })
    route.addNode(nodos[19][16], { 'TP': num_rand(), 'TR': num_rand(), 'SQ': num_rand() })
    route.addNode(nodos[19][17], { 'TQ': num_rand(), 'TS': num_rand(), 'SR': num_rand() })
    route.addNode(nodos[19][18], { 'TR': num_rand(), 'TT': num_rand(), 'SS': num_rand() })
    route.addNode(nodos[19][19], { 'TS': num_rand(), 'ST': num_rand() })

    // PARA PRUEBAS
    console.log(route.path(nodos[9][15], nodos[7][4]))
    console.log(route[1])
}

function restart() { }