/*
 * SepararMesasEnArchivos.jsx
 * --------------------------------------------------------------
 * Adobe Illustrator (ExtendScript)
 *
 * Divide el documento activo en varios archivos .ai independientes.
 * Cada archivo contiene un grupo de N mesas de trabajo consecutivas
 * (1-2, 3-4, 5-6... si N = 2) con su contenido original y editable.
 *
 * Opciones al ejecutar:
 *   - Mesas de trabajo por archivo (2, 3, 4...)
 *   - Nombre base de los archivos
 *   - Numeración como prefijo (01_Nombre.ai) o sufijo (Nombre_01.ai)
 *   - Separador, número inicial y número de dígitos
 *   - Carpeta de destino
 *   - Eliminar el contenido que queda fuera de las mesas conservadas
 *
 * Funcionamiento: para cada grupo se hace una copia exacta del .ai
 * original, se abre, se eliminan las mesas que no pertenecen al grupo
 * (y opcionalmente el arte que queda fuera de ellas) y se guarda.
 * El documento original no se modifica.
 *
 * Instalación: Archivo > Secuencias de comandos > Otra secuencia de
 * comandos... o copiar en la carpeta Presets/<idioma>/Scripts.
 */

#target illustrator

(function () {

    // ---------------------------------------------------------------
    // Comprobaciones iniciales
    // ---------------------------------------------------------------
    if (app.documents.length === 0) {
        alert("Abre un documento de Illustrator antes de ejecutar el script.");
        return;
    }

    var srcDoc = app.activeDocument;
    var totalArtboards = srcDoc.artboards.length;

    if (totalArtboards < 2) {
        alert("El documento solo tiene una mesa de trabajo. No hay nada que separar.");
        return;
    }

    // El documento tiene que existir en disco para poder copiarlo.
    var srcFile;
    try {
        srcFile = srcDoc.fullName;
    } catch (e) {
        srcFile = null;
    }
    if (!srcFile || !srcFile.exists || !/\.ai$/i.test(srcFile.name)) {
        alert("Guarda primero el documento como archivo .ai (Archivo > Guardar como...) y vuelve a ejecutar el script.");
        return;
    }

    if (!srcDoc.saved) {
        if (!confirm("El documento tiene cambios sin guardar.\n\nPara incluirlos en los archivos nuevos hay que guardarlo ahora. ¿Guardar y continuar?")) {
            return;
        }
        srcDoc.save();
    }

    // ---------------------------------------------------------------
    // Utilidades
    // ---------------------------------------------------------------
    function pad(num, digits) {
        var s = String(num);
        while (s.length < digits) s = "0" + s;
        return s;
    }

    function cleanName(str) {
        return str.replace(/[\\\/:\*\?"<>\|]/g, "-").replace(/^\s+|\s+$/g, "");
    }

    function baseNameOf(file) {
        return decodeURI(file.name).replace(/\.[^\.]+$/, "");
    }

    function buildFileName(cfg, index) {
        var num = pad(cfg.start + index, cfg.digits);
        var name = cfg.prefix ? (num + cfg.sep + cfg.base) : (cfg.base + cfg.sep + num);
        return name + ".ai";
    }

    function groupRange(cfg, index) {
        var from = index * cfg.size;
        var to = Math.min(from + cfg.size, totalArtboards) - 1;
        return { from: from, to: to };
    }

    function rangeLabel(r) {
        return r.from === r.to ? ("mesa " + (r.from + 1)) : ("mesas " + (r.from + 1) + "-" + (r.to + 1));
    }

    function intersects(b, r) {
        // Coordenadas de Illustrator: [izquierda, arriba, derecha, abajo], Y hacia arriba.
        return !(b[2] < r[0] || b[0] > r[2] || b[1] < r[3] || b[3] > r[1]);
    }

    function intersectsAny(item, rects) {
        var b;
        try {
            b = item.visibleBounds;
        } catch (e) {
            return true; // si no se pueden leer los límites, mejor conservarlo
        }
        for (var i = 0; i < rects.length; i++) {
            if (intersects(b, rects[i])) return true;
        }
        return false;
    }

    function cleanLayer(layer, rects) {
        var wasLocked = layer.locked;
        var wasVisible = layer.visible;
        layer.locked = false;
        layer.visible = true;

        for (var i = layer.pageItems.length - 1; i >= 0; i--) {
            var item = layer.pageItems[i];
            if (!intersectsAny(item, rects)) {
                try {
                    item.locked = false;
                    item.hidden = false;
                    item.remove();
                } catch (e) { /* se conserva si no se puede eliminar */ }
            }
        }

        for (var j = layer.layers.length - 1; j >= 0; j--) {
            cleanLayer(layer.layers[j], rects);
        }

        layer.locked = wasLocked;
        layer.visible = wasVisible;
    }

    // ---------------------------------------------------------------
    // Diálogo
    // ---------------------------------------------------------------
    var defaults = {
        size: 2,
        base: baseNameOf(srcFile),
        prefix: false,
        sep: "_",
        start: 1,
        digits: 2,
        folder: srcFile.parent,
        deleteOutside: true,
        pdfCompatible: true
    };

    var w = new Window("dialog", "Separar mesas de trabajo en archivos");
    w.orientation = "column";
    w.alignChildren = "fill";

    w.add("statictext", undefined, "Documento: " + decodeURI(srcFile.name) + "  —  " + totalArtboards + " mesas de trabajo");

    // Agrupación
    var pGroup = w.add("panel", undefined, "Agrupación");
    pGroup.alignChildren = "left";
    var gSize = pGroup.add("group");
    gSize.add("statictext", undefined, "Mesas de trabajo por archivo:");
    var etSize = gSize.add("edittext", undefined, String(defaults.size));
    etSize.characters = 4;

    // Nombre
    var pName = w.add("panel", undefined, "Nombre de los archivos");
    pName.alignChildren = "left";

    var gBase = pName.add("group");
    gBase.add("statictext", undefined, "Nombre base:");
    var etBase = gBase.add("edittext", undefined, defaults.base);
    etBase.characters = 30;

    var gPos = pName.add("group");
    gPos.add("statictext", undefined, "Numeración:");
    var rbSuffix = gPos.add("radiobutton", undefined, "Sufijo (Nombre_01)");
    var rbPrefix = gPos.add("radiobutton", undefined, "Prefijo (01_Nombre)");
    rbSuffix.value = !defaults.prefix;
    rbPrefix.value = defaults.prefix;

    var gNum = pName.add("group");
    gNum.add("statictext", undefined, "Separador:");
    var etSep = gNum.add("edittext", undefined, defaults.sep);
    etSep.characters = 3;
    gNum.add("statictext", undefined, "Empezar en:");
    var etStart = gNum.add("edittext", undefined, String(defaults.start));
    etStart.characters = 4;
    gNum.add("statictext", undefined, "Dígitos:");
    var etDigits = gNum.add("edittext", undefined, String(defaults.digits));
    etDigits.characters = 3;

    // Destino
    var pDest = w.add("panel", undefined, "Carpeta de destino");
    pDest.alignChildren = "fill";
    var gDest = pDest.add("group");
    var stFolder = gDest.add("statictext", undefined, decodeURI(defaults.folder.fsName), { truncate: "middle" });
    stFolder.preferredSize.width = 330;
    var btFolder = gDest.add("button", undefined, "Elegir...");
    var destFolder = defaults.folder;

    btFolder.onClick = function () {
        var f = Folder.selectDialog("Elige la carpeta de destino", destFolder);
        if (f) {
            destFolder = f;
            stFolder.text = decodeURI(f.fsName);
        }
    };

    // Opciones
    var pOpts = w.add("panel", undefined, "Opciones");
    pOpts.alignChildren = "left";
    var cbDelete = pOpts.add("checkbox", undefined, "Eliminar el contenido que queda fuera de las mesas conservadas");
    cbDelete.value = defaults.deleteOutside;
    var cbPdf = pOpts.add("checkbox", undefined, "Crear archivo compatible con PDF");
    cbPdf.value = defaults.pdfCompatible;

    // Vista previa
    var pPrev = w.add("panel", undefined, "Vista previa");
    pPrev.alignChildren = "fill";
    var stPrev = pPrev.add("statictext", undefined, "", { multiline: true });
    stPrev.preferredSize = [420, 90];

    // Botones
    var gBtns = w.add("group");
    gBtns.alignment = "right";
    gBtns.add("button", undefined, "Cancelar", { name: "cancel" });
    var btOk = gBtns.add("button", undefined, "Generar archivos", { name: "ok" });

    function readConfig() {
        var cfg = {
            size: parseInt(etSize.text, 10),
            base: cleanName(etBase.text),
            prefix: rbPrefix.value,
            sep: cleanName(etSep.text),
            start: parseInt(etStart.text, 10),
            digits: parseInt(etDigits.text, 10),
            deleteOutside: cbDelete.value,
            pdfCompatible: cbPdf.value
        };
        cfg.valid = !isNaN(cfg.size) && cfg.size >= 1 &&
                    !isNaN(cfg.start) && cfg.start >= 0 &&
                    !isNaN(cfg.digits) && cfg.digits >= 1 && cfg.digits <= 6 &&
                    cfg.base.length > 0;
        if (cfg.valid) cfg.count = Math.ceil(totalArtboards / cfg.size);
        return cfg;
    }

    function updatePreview() {
        var cfg = readConfig();
        if (!cfg.valid) {
            stPrev.text = "Revisa los valores: tamaño de grupo, número inicial y dígitos deben ser números válidos y el nombre no puede estar vacío.";
            btOk.enabled = false;
            return;
        }
        btOk.enabled = true;
        var lines = [];
        lines.push(cfg.count + " archivo(s):");
        var show = Math.min(cfg.count, 3);
        for (var i = 0; i < show; i++) {
            lines.push("   " + buildFileName(cfg, i) + "   (" + rangeLabel(groupRange(cfg, i)) + ")");
        }
        if (cfg.count > 3) {
            lines.push("   ...");
            lines.push("   " + buildFileName(cfg, cfg.count - 1) + "   (" + rangeLabel(groupRange(cfg, cfg.count - 1)) + ")");
        }
        var rest = totalArtboards % cfg.size;
        if (rest !== 0) {
            lines.push("AVISO: " + totalArtboards + " no es divisible entre " + cfg.size + ": el último archivo tendrá " + rest + " mesa(s).");
        }
        stPrev.text = lines.join("\n");
    }

    etSize.onChanging = etBase.onChanging = etSep.onChanging =
        etStart.onChanging = etDigits.onChanging = updatePreview;
    rbPrefix.onClick = rbSuffix.onClick = updatePreview;
    updatePreview();

    if (w.show() !== 1) return;

    var cfg = readConfig();
    if (!cfg.valid) return;

    // ---------------------------------------------------------------
    // Validaciones antes de generar
    // ---------------------------------------------------------------
    if (totalArtboards % cfg.size !== 0) {
        if (!confirm("Hay " + totalArtboards + " mesas de trabajo y no es divisible entre " + cfg.size +
                     ".\nEl último archivo tendrá solo " + (totalArtboards % cfg.size) + " mesa(s).\n\n¿Continuar?")) {
            return;
        }
    }

    if (!destFolder.exists) destFolder.create();

    var targets = [];
    var existing = [];
    for (var g = 0; g < cfg.count; g++) {
        var f = new File(destFolder.fsName + "/" + buildFileName(cfg, g));
        if (f.fsName === srcFile.fsName) {
            alert("El archivo \"" + f.name + "\" coincide con el documento original. Cambia el nombre base o la carpeta de destino.");
            return;
        }
        if (f.exists) existing.push(decodeURI(f.name));
        targets.push(f);
    }

    if (existing.length > 0) {
        var list = existing.slice(0, 8).join("\n") + (existing.length > 8 ? "\n..." : "");
        if (!confirm("Ya existen " + existing.length + " archivo(s) con ese nombre:\n\n" + list + "\n\n¿Sobrescribirlos?")) {
            return;
        }
    }

    // ---------------------------------------------------------------
    // Generación
    // ---------------------------------------------------------------
    var saveOpts = new IllustratorSaveOptions();
    saveOpts.pdfCompatible = cfg.pdfCompatible;
    saveOpts.embedICCProfile = true;
    saveOpts.compressed = true;
    saveOpts.saveMultipleArtboards = false;

    var progress = new Window("palette", "Separando mesas de trabajo...");
    progress.alignChildren = "fill";
    var bar = progress.add("progressbar", undefined, 0, cfg.count);
    bar.preferredSize.width = 320;
    var stStatus = progress.add("statictext", undefined, "");
    progress.show();

    var prevInteraction = app.userInteractionLevel;
    app.userInteractionLevel = UserInteractionLevel.DONTDISPLAYALERTS;

    var created = [];
    var errors = [];

    try {
        for (var k = 0; k < cfg.count; k++) {
            var target = targets[k];
            var range = groupRange(cfg, k);
            stStatus.text = decodeURI(target.name) + "  (" + rangeLabel(range) + ")";
            progress.update();

            var copyDoc = null;
            try {
                if (target.exists) target.remove();
                if (!srcFile.copy(target)) throw new Error("No se pudo copiar el archivo original.");

                copyDoc = app.open(target);

                // 1. Eliminar las mesas de trabajo que no pertenecen al grupo.
                for (var a = copyDoc.artboards.length - 1; a >= 0; a--) {
                    if (a < range.from || a > range.to) copyDoc.artboards.remove(a);
                }
                copyDoc.artboards.setActiveArtboardIndex(0);

                // 2. Eliminar el arte que queda fuera de las mesas conservadas.
                if (cfg.deleteOutside) {
                    var rects = [];
                    for (var r = 0; r < copyDoc.artboards.length; r++) {
                        rects.push(copyDoc.artboards[r].artboardRect);
                    }
                    for (var l = copyDoc.layers.length - 1; l >= 0; l--) {
                        cleanLayer(copyDoc.layers[l], rects);
                    }
                }

                copyDoc.saveAs(target, saveOpts);
                copyDoc.close(SaveOptions.DONOTSAVECHANGES);
                copyDoc = null;
                created.push(decodeURI(target.name));
            } catch (err) {
                errors.push(decodeURI(target.name) + ": " + err.message);
                if (copyDoc) {
                    try { copyDoc.close(SaveOptions.DONOTSAVECHANGES); } catch (e2) {}
                }
            }

            bar.value = k + 1;
            progress.update();
        }
    } finally {
        app.userInteractionLevel = prevInteraction;
        progress.close();
        try { app.activeDocument = srcDoc; } catch (e3) {}
    }

    var msg = "Archivos creados: " + created.length + " de " + cfg.count +
              "\nCarpeta: " + decodeURI(destFolder.fsName);
    if (errors.length > 0) {
        msg += "\n\nErrores:\n" + errors.join("\n");
    }
    alert(msg);

})();
