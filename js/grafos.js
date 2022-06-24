/* SELECTOR DE BOTONES, MENU PRINCIPAL */

var header = document.querySelector(".controles");
var btns = header.getElementsByClassName("botones_control");
for (var i = 0; i < btns.length; i++) {
    btns[i].addEventListener("click", function () {
        var current = document.getElementsByClassName("active");
        current[0].className = current[0].className.replace(" active", "");
        this.className += " active";
    });
}
var lienzo_1 = d3.select("#canvas_1");

btns[1].addEventListener("click", function () {
    alert("La pantalla 2 aún no está disponible :C");
    lienzo_1 = d3.select("#canvas_2");
});

/* BOTON ELIMINA GRAFOS */
var btn_elimina = document.querySelector("#eliminar_grafos");
btn_elimina.addEventListener("click", limpiar_todo);

/* VARIABLES GENERALES */
var colores = ["#0078D7", "#2196F3", "#3F51B5", "#FFAB00", "#8E24AA", "#26A69A", "#0277BD", "#64B5F6", "#9575CD", "#01579B", "#01579B"];
var mcaminos = [], matrizRes = [], c = [];
var columm = null;
var mousedownNode = null;
var tool = null, seleccion = null;
const uuid = Math.floor(Math.random() * 1e9);
var yoffset = 4;
var w = 500, h = 400 - yoffset, radio = 12;

var matriz_aux = [], matriz_sec = [], matriz_terc = [], mat_identidad = [], mat_anterior = [];

var conexion = 0, caminocta = 0, vSimples = 0, region = 0, vmgrafo = 0;

/* NODOS Y ENLACES */
var nodos = [], enlaces = [];
var source = [], target = [];
var ultimoNodo = nodos.length;

/* DEFINICION DEL CANVAS */
lienzo_1.attr("width", w).attr("height", h);
console.log(w, h)
lienzo_1.on("contextmenu", function () {
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

lienzo_1
    .on("mousedown", agrega_nodo)
    .on("mousemove", updateDragLine)
    .on("mouseup", hideDragLine)
    .on("mouseleave", hideDragLine);

var dibujar_linea = lienzo_1
    .append("path")
    .attr("class", "dragLine hidden")
    .attr("d", "M0,0L0,0");

var flecha = lienzo_1
    .append('defs')
    .append('marker')
    .attr('id', `arrowhead-${uuid}`)
    .attr('viewBox', '-0 -5 10 10')
    .attr('refX', 18)
    .attr('refY', 0)
    .attr('orient', 'auto')
    .attr('markerWidth', 3)
    .attr('markerHeight', 3)
    .attr('xoverflow', 'visible')
    .append('svg:path')
    .attr('d', 'M 0,-5 L 10 ,0 L 0,5')
    .attr('fill', "#999")
    .attr('stroke', "#999");

var aristas = lienzo_1.append("g").selectAll(".arista");
var vertices = lienzo_1.append("g").selectAll(".vertice");

/* ACTUALIZAR VISUALIZACION */
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

/* BOTON FLECHA */
var flechaCheck = document.querySelector('input[name="flechas"]');
flechaCheck.addEventListener("click", mostrarFlechas);
function mostrarFlechas() {
    if (flechaCheck.checked == true) {
        document.querySelectorAll(".arista").forEach(function (d) {
            d.setAttribute("marker-end", "url(#arrowhead-" + uuid + ")");
        })

    } else {
        document.querySelectorAll(".arista").forEach(function (d) {
            d.setAttribute("marker-end", "");
        })
    }
}
/* MOSTRAR NUMEROS */
function mostrarNum() {
    if (numLabel.checked == true) {
        d3.selectAll(".texto").style("display", "inline");
    } else {
        d3.selectAll(".texto").style("display", "none");
    }
}

var numLabel = document.querySelector('input[name="numeros"]');
numLabel.addEventListener("click", mostrarNum);
function mostrarNum() {
    if (numLabel.checked == true) {
        d3.selectAll(".texto").style("display", "inline");
    } else {
        d3.selectAll(".texto").style("display", "none");
    }
}

/* BOTON PROPIEDADES */
document.querySelector(".propiedades").addEventListener("click", propiedades);
var labelre = document.querySelector(".region");
var barraderecha = document.querySelector(".derecha");
var nAristas = document.querySelector(".naristas");
var nVertices = document.querySelector(".nvertices");
var enlacesReales = new Array();
var enlacesIndex = [];

/* AGREGAR/ELIMINAR NODO */
function agrega_nodo() {
    var e = d3.event;
    if (e.button == 0) {
        var coords = d3.mouse(e.currentTarget);
        var newNode = { x: coords[0], y: coords[1], id: ++ultimoNodo, grado: 0, color: ultimoNodo % 10 };
        nodos.push(newNode);
        restart();
    }
}

function eliminar_nodo(d, i) {
    nodos.splice(nodos.indexOf(d), 1);
    var enlacesToRemove = enlaces.filter(function (l) {
        if (typeof (d.source) !== "undefined") l.source.grado--;
        return l.source === d || l.target === d;
    });
    enlacesToRemove.map(function (l) {
        enlaces.splice(enlaces.indexOf(l), 1);
    });
    d3.event.preventDefault();
    restart();
}

function removeEdge(d, i) {
    d.source.grado--;
    enlaces.splice(enlaces.indexOf(d), 1);
    d3.event.preventDefault();
    restart();
}
function beginDragLine(d) {
    d3.event.stopPropagation();
    d3.event.preventDefault();
    mousedownNode = d;
    dibujar_linea
        .classed("hidden", false)
        .attr(
            "d",
            "M" +
            mousedownNode.x +
            "," +
            mousedownNode.y +
            "L" +
            mousedownNode.x +
            "," +
            mousedownNode.y
        );
}
function updateDragLine() {
    var coords = d3.mouse(d3.event.currentTarget);
    if (!mousedownNode) return;
    dibujar_linea.attr(
        "d",
        "M" +
        mousedownNode.x +
        "," +
        mousedownNode.y +
        "L" +
        coords[0] +
        "," +
        coords[1]
    );
}
function hideDragLine() {
    dibujar_linea.classed("hidden", true);
    mousedownNode = null;
}

function endDragLine(d) {
    if (!mousedownNode || mousedownNode === d) return;
    for (let index = 0; index < enlaces.length; index++) {
        var l = enlaces[index];
        if (l.source === mousedownNode && l.target === d) return;
    }
    mousedownNode.grado++;
    var newLink = { source: mousedownNode, target: d };
    enlaces.push(newLink);
    restart();
}
function nEnlaces(n_enlaces) {
    var cta = 0, zero = 0, uno = 1;
    for (let i = 0; i < n_enlaces.length; i++) {
        for (let j = 0; j < n_enlaces.length; j++) {
            if (n_enlaces[i][zero] === n_enlaces[j][uno] && n_enlaces[i][uno] === n_enlaces[j][zero]) {
                cta++;
            }
        }
    }
    vSimples = cta / 2;
    cta = n_enlaces.length - vSimples;
    return (cta)
}

function aristasVertices() {
    enlacesReales = [];
    for (let index = 0; index < enlaces.length; index++) {
        for (let jndex = 0; jndex < enlaces.length; jndex++) {
            if (index == jndex) {
                enlacesReales[index] = new Array(enlaces[index].source.id, enlaces[jndex].target.id);
            }
        }
    }

    for (let index = 0; index < enlacesReales.length; index++) {
        for (let jndex = 0; jndex < enlacesReales.length; jndex++) {
            if (jndex == 0) {
                enlacesIndex[index] = enlacesReales[index][jndex];
            }
        }
    }
    nAristas.innerHTML = nEnlaces(enlacesReales);
    nVertices.innerHTML = nodos.length;
}

function regiones() {
    region = 2 - nodos.length + nEnlaces(enlacesReales);
    if (region < 1) region = 1;
    document.querySelector(".region").innerHTML = region;
}
/* MATRIZ */
document.querySelector(".matrizhide").addEventListener("click", e => {
    var tablamatriz = document.querySelector(".matriz-ady")
    var tablamatrizC = document.querySelector(".matriz-c")
    var labelAdy = document.querySelector(".label-ady")
    var labelC = document.querySelector(".label-c")
    if (tablamatriz.style.display == "block") {
      tablamatriz.style.display = "none";
      tablamatrizC.style.display = "none";
      labelAdy.style.display = "none";
      labelC.style.display = "none";
    } else {
      tablamatriz.style.display = "block";
      tablamatrizC.style.display = "block";
      labelAdy.style.display = "block";
      labelC.style.display = "block";
    }
  });
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
function propiedades() {
    for (let index = 0; index < enlaces.length; index++) {
        columm = enlaces[index];
        source.push(columm.source.index);
        target.push(columm.target.index);
        matriz_aux.push([index]);
    }
    matriz_sec.push(source);
    matriz_sec.push(target);

    for (let index = 0; index < nodos.length; index++) {
        matriz_aux[index] = source[index] + "," + target[index];
    }
    // Llena una matriz con 0's
    for (let index = 0; index < nodos.length; index++) {
        matriz_terc[index] = Array(nodos.length).fill(0);
        mat_identidad[index] = Array(nodos.length).fill(0);
        matrizRes[index] = Array(nodos.length).fill(0);
    }
    //Matriz Indentidad
    for (let index = 0; index < nodos.length; index++) {
        for (let jndex = 0; jndex < nodos.length; jndex++) {
            if (index == jndex) {
                mat_identidad[index][jndex] = 1;
            }
        }
    }
    //Matriz funcionando
    for (let jndex = 0; jndex <= nodos.length - 1; jndex++) {
        for (let kndex = 0; kndex <= source.length - 1; kndex++) {
            for (let lndex = 0; lndex <= matriz_sec.length - 1; lndex++) {
                var m = matriz_sec[lndex][kndex];
                if (lndex == 0) {
                    mm = m;
                }
            }
            matriz_terc[mm][m] = 1;
        }
        break;
    }
    var matrizAdy = tabla(matriz_terc);
    document.querySelector(".matriz-ady").innerHTML = matrizAdy;
    mat_anterior = matriz_terc;
    matrizCaminos(matriz_terc);
    aristasVertices();
    regiones();
    if (enlaces.length == 0) {
        return
    }
    tipoGrafo();
    nCromatico();
    regular();
    euleriano();
    hamilton();
    conexo();
    grafoPlano();
    completo();
}

function sumMatrices(matriz1, matriz2) {
    var sum = 0;
    for (let index = 0; index < matriz1.length; index++) {
        for (let jndex = 0; jndex < matriz1.length; jndex++) {
            sum = matriz1[index][jndex] + matriz2[index][jndex];
            matrizRes[index][jndex] = sum;
        }
    }
    return matrizRes;
}

function matrizCaminos(mcaminos) {
    var sum = 0;
    var matrixAux = [], mSum = [];
    var n = nodos.length - 1;

    for (let index = 0; index < mcaminos.length; index++) {
        matrixAux[index] = [];
        for (let jndex = 0; jndex < mcaminos[0].length; jndex++) {
            for (let kndex = 0; kndex < mcaminos[0].length; kndex++) {
                sum += mcaminos[index][kndex] * matriz_terc[kndex][jndex];
            }
            matrixAux[index][jndex] = sum;
            sum = 0;
        }
    }
    mcaminos = matrixAux;
    caminocta++;
    if (caminocta == n) {
        c = sumMatrices(mat_identidad, mat_anterior)
        var matrizC = tabla(c);
        document.querySelector(".matriz-c").innerHTML = matrizC;
        mcaminos = [];
        return caminocta = 0;
    }
    else {
        mSum = sumMatrices(mcaminos, mat_anterior)
        mat_anterior = mSum;
        return matrizCaminos(mcaminos);
    }
}

var tipo = document.querySelector(".tipo");
var conx = document.querySelector(".conexo");
/* TIPOS DE GRAFOS */
function tipoGrafo() {
    if (enlaces.length == nEnlaces(enlacesReales)) {
        tipo.innerHTML = "Es dirigido"
    }
    if (enlaces.length / 2 == nEnlaces(enlacesReales)) {
        tipo.innerHTML = "Es Simple";
    }
    if (enlaces.length != nEnlaces(enlacesReales) && enlaces.length / 2 != nEnlaces(enlacesReales)) {
        tipo.innerHTML = "Es multidigrafo";
    }
}

function conexo() {
    var conexo = null;
    for (let index = 0; index < c.length; index++) {
        for (let jndex = 0; jndex < c.length; jndex++) {
            if (c[index][jndex] == 0) {
                conexo = false;
                conx.innerHTML = "Es diconexo";
                break;
            }
        }
    }
    if (conexo == null) {
        conexo = true;
        conx.innerHTML = "Es conexo";
    }
}

function grafoPlano() {
    var caras = region - 2;
    plano = caras - nodos.length + nEnlaces(enlacesReales)
    if (plano == 2) {
        document.querySelector(".plano").innerHTML = "Es plano";
        document.querySelector(".plan").style.display = "block";
    }
}

function completo() {
    var n = nodos.length;
    if (((n * (n - 1)) / 2) == nEnlaces(enlacesReales)) {
        document.querySelector(".completo").innerHTML = "Es completo";
        document.querySelector(".comp").style.display = "block";
    }
}

function nCromatico() {
    var mgrado = 0;
    for (let index = 0; index < nodos.length; index++) {
        if (nodos[index].grado > mgrado) {
            mgrado = nodos[index].grado
            vmgrafo = nodos[index].id
        }
    }
    document.querySelector(".ncroma").innerHTML = "Numero cromatico " + (mgrado + 1);
}

function regular() {
    var reg = true;
    for (let index = 0; index < nodos.length; index++) {
        if (nodos[index].grado != nodos[0].grado) {
            reg = false
            break;
        }
    }
    if (reg == true) document.querySelector(".regular").innerHTML = "Es regular";
    else document.querySelector(".regular").innerHTML = "No es regular";
}

function euleriano() {
    var parcta = 0, imparcta = 0;
    for (let index = 0; index < nodos.length; index++) {
        if (nodos[index].grado % 2 == 0) parcta++;
        else imparcta++;
    }
    if (parcta == nodos.length) {
        document.querySelector(".circuito-eu").innerHTML = "Circuito Euleriano";
        document.querySelector(".circuito-eu").style.display = "block !important";
        document.querySelector(".grafo-eu").innerHTML = "Grafo Euleriano";
        document.querySelector(".grafo-eu").style.display = "block !important";
    }
    if (imparcta == 2 && parcta == nodos.length - 2) {
        document.querySelector(".camino-eu").innerHTML = "Camino Euleriano";
        document.querySelector(".camino-eu").style.display = "block !important";
    }
}

function hamilton() {
    var grado1 = vmgrafo - 1;
    if (nodos[grado1].grado + nodos[2].grado >= nodos.length - 1) {
        document.querySelector(".hamilton").innerHTML = "Camino Hamiltoniano"
    }
}

function cambioTool(toolname) {
    var toolBtn1 = 'button[name="', toolBtn2 = '"]';
    tool = toolBtn1 + toolname + toolBtn2;
    d3.selectAll(".tool").classed("activo", false);
    d3.select(tool).classed("activo", true);
    tool = toolname;

    lienzo_1
        .on("mousedown", null)
        .on("mousemove", null)
        .on("mouseup", null);

    vertices
        .on("mousedown", null)

    aristas
        .on("mousedown", null)
        .on("mouseup", null);

    restart();
}
/* LIMPIAR TODO */
function limpiar_todo() {
    nodos.splice(0);
    enlaces.splice(0);
    ultimoNodo = 0;
    d3.selectAll("text").remove();
    matriz_terc = [];
    matriz_sec = [];
    restart();
}

/* REINICIA LOS EVENTOS EN EL CANVAS */
function restart() {
    aristas = aristas.data(enlaces, function (d) {
        return "v" + d.source.id + "-v" + d.target.id;
    });
    aristas.exit().remove();

    var ar = aristas
        .enter()
        .append("line")
        .attr("class", "arista")
        .attr('marker-end', `url(#arrowhead-${uuid})`)
        .on("mousedown", function () {
            d3.event.stopPropagation();
        })
        .on("contextmenu", removeEdge);

    ar.append("title").text(function (d) {
        return "v" + d.source.id + "-v" + d.target.id;
    });

    aristas = ar.merge(aristas);

    flecha.style("display", mostrarFlechas)

    vertices = vertices.data(nodos, function (d) {
        return d.id;
    });
    vertices.exit().remove();

    vertices.selectAll("text").text(function (d) {
        return d.id;
    });

    var ve = vertices
        .enter()
        .append("g")
        .attr("class", "vertice")
        .on("mousedown", beginDragLine)
        .on("mouseup", endDragLine)
        .on("contextmenu", eliminar_nodo);

    ve.append("circle")
        .attr("r", radio)
        .style("fill", function (d) {
            return colores[d.color]
        })
        .attr("n", function (d) {
            return d.id
        })
        .append("title").text(function (d) {
            return "v" + d.id;
        });

    ve.append("text")
        .attr("class", "texto")
        .attr("x", function (d) {
            if (d.id < 10) return - 4;
            else return - 8;
        })
        .attr("y", 5)
        .style("dislay", mostrarNum)
        .text(function (d) {
            return d.id;
        });

    vertices = ve.merge(vertices);

    force.nodes(nodos);
    force.force("link").links(enlaces);
    force.alpha(0.8).restart();
}

restart();