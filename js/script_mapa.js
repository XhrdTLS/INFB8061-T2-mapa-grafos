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
var matriz_vel = [];
var matriz_traf = [];

// Al tener tamañ0 de 25 x 25 de celdas, se define el i como 25
var i = 25;
var yoffset = 4;
var w = 500, h = 400 - yoffset, radio = 12;

const random = Math.random();
console.log(random);

/* Nodos y Enlaces */
var nodos = [], enlaces = [];
var source = [], target = [];
var ultimoNodo = nodos.length;

/* Seleccion del lienzo */
var lienzo = d3.select(".interactive_zone");
lienzo.attr("width", w).attr("height", h);
console.log(w, h)
lienzo.on("contextmenu", function () {
    d3.event.preventDefault();
});

var force = d3
    .forceSimulation()
    .force(
        "charge",
        d3
            .forceManyBody()
            .strength(-300)
            .distanceMax(w / 2)
    )
    .force("link", d3.forceLink().distance(80))
    .force("x", d3.forceX(w / 2))
    .force("y", d3.forceY(h / 2))
    .on("tick", reload);

force.nodes(nodos);
force.force("link").links(enlaces);

/*lienzo .on("mousedown", agrega_elemento);*/
var aristas = lienzo.append("g").selectAll(".arista");
var vertices = lienzo.append("g").selectAll(".vertice");

function reload() {
    aristas
        .attr("x1", function (d) {
            return d.source.x;
        })
        .attr("y1", function (d) {
            return d.source.y;
        })
        .attr("x2", function (d) {
            return d.target.x;
        })
        .attr("y2", function (d) {
            return d.target.y;
        });

    vertices.attr("transform", function (d) {
        return "translate(" + d.x + "," + d.y + ")";
    });
}

function tabla(matriz) {
    var tabla = "<table border=\"0\">";

    tabla += "<tr><td></td>";
    for (let jndex = 0; jndex < nodos.length; jndex++) {
        tabla += "<td>" + (jndex + 1) + "</td>";
    }
    tabla += "</tr>";

    for (let index = 0; index < nodos.length; index++) {
        tabla += "<tr>";
        tabla += "<td>" + (index + 1) + "</td>";
        for (let jndex = 0; jndex < nodos.length; jndex++) {
            tabla += "<td>" + matriz[index][jndex] + "</td>";
        }
        tabla += "</tr>";
    }
    tabla += "</table>";

    return tabla;
}