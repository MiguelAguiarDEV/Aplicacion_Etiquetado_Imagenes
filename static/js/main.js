const canvas = new fabric.Canvas('canvas');
let imagenActual = null;
let categorias = {}; // Almacena las categorías y sus colores
let categoriaSeleccionada = null;

// Subir imagen
document.getElementById('imageUpload').addEventListener('change', async (event) => {
    const archivo = event.target.files[0];
    const formData = new FormData();
    formData.append('image', archivo);

    const respuesta = await fetch('/upload', { method: 'POST', body: formData });
    const datos = await respuesta.json();

    fabric.Image.fromURL(datos.image_url, (img) => {
        const anchoCanvas = canvas.width;
        const altoCanvas = canvas.height;
        const proporcionImg = img.width / img.height;
        const proporcionCanvas = anchoCanvas / altoCanvas;

        let anchoEscalado, altoEscalado;

        if (proporcionImg > proporcionCanvas) {
            anchoEscalado = anchoCanvas;
            altoEscalado = anchoCanvas / proporcionImg;
        } else {
            anchoEscalado = altoCanvas * proporcionImg;
            altoEscalado = altoCanvas;
        }

        img.scaleToWidth(anchoEscalado);
        img.scaleToHeight(altoEscalado);

        canvas.clear();
        canvas.setBackgroundImage(img, canvas.renderAll.bind(canvas));
        imagenActual = archivo.name;
    });
});

// Agregar nueva categoría
document.getElementById('addLabel').addEventListener('click', () => {
    const nombreCategoria = document.getElementById('newLabel').value.trim();
    const colorCategoria = document.getElementById('labelColor').value;

    if (nombreCategoria && !categorias[nombreCategoria]) {
        categorias[nombreCategoria] = colorCategoria;

        const opcion = document.createElement('option');
        opcion.value = nombreCategoria;
        opcion.textContent = nombreCategoria;
        document.getElementById('labelSelector').appendChild(opcion);

        document.getElementById('labelSelector').value = nombreCategoria;
        categoriaSeleccionada = nombreCategoria;

        alert(`¡Categoría "${nombreCategoria}" agregada!`);
    } else {
        alert('La categoría ya existe o el nombre está vacío.');
    }
});

// Seleccionar categoría
document.getElementById('labelSelector').addEventListener('change', (event) => {
    categoriaSeleccionada = event.target.value;
});

// Dibujar cajas en el canvas
canvas.on('mouse:down', (event) => {
    if (!canvas.getActiveObject() && categoriaSeleccionada) {
        const puntero = canvas.getPointer(event.e);
        const rectangulo = new fabric.Rect({
            left: puntero.x,
            top: puntero.y,
            width: 100,
            height: 100,
            fill: categorias[categoriaSeleccionada] + '33',
            stroke: categorias[categoriaSeleccionada],
            strokeWidth: 2,
            hasControls: true,
            hasBorders: true,
            label: categoriaSeleccionada
        });
        canvas.add(rectangulo);
    }
});

// Eliminar caja seleccionada
document.getElementById('deleteBox').addEventListener('click', () => {
    const objetoActivo = canvas.getActiveObject();
    if (objetoActivo) {
        canvas.remove(objetoActivo);
    } else {
        alert('No hay ninguna caja seleccionada.');
    }
});

// Limpiar todas las cajas
document.getElementById('clearCanvas').addEventListener('click', () => {
    
    canvas.remove(...canvas.getObjects());
    alert('¡Todas las cajas han sido eliminadas!');
});

// Eliminar categoría seleccionada
document.getElementById('deleteCategory').addEventListener('click', () => {
    const selectorCategorias = document.getElementById('labelSelector');
    const categoriaAEliminar = selectorCategorias.value;

    if (categoriaAEliminar) {
        if (!confirm(`¿Estás seguro de que deseas eliminar la categoría "${categoriaAEliminar}" y todas sus cajas asociadas?`)) {
            return;
        }

        delete categorias[categoriaAEliminar];
        selectorCategorias.removeChild(selectorCategorias.querySelector(`option[value="${categoriaAEliminar}"]`));

        const objetosAEliminar = canvas.getObjects().filter(obj => obj.label === categoriaAEliminar);
        objetosAEliminar.forEach(obj => canvas.remove(obj));

        alert(`¡Categoría "${categoriaAEliminar}" y todas sus cajas asociadas han sido eliminadas!`);
    } else {
        alert('No hay ninguna categoría seleccionada.');
    }
});

// Guardar etiquetas
document.getElementById('saveLabels').addEventListener('click', async () => {
    const formato = document.getElementById('formatSelector').value;

    // Generar etiquetas para enviar al backend
    const etiquetas = canvas.getObjects().map(obj => {
        return {
            label: obj.label, // Nombre de la categoría
            bbox: [obj.left, obj.top, obj.width, obj.height] // Coordenadas del bounding box
        };
    });

    // Enviar las etiquetas al backend
    const respuesta = await fetch('/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: imagenActual, labels: etiquetas, format: formato })
    });

    const datos = await respuesta.json();
    alert(datos.message);
});
