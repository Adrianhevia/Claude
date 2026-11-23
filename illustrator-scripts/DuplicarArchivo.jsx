/*
 * DuplicarArchivo.jsx
 * --------------------------------------------------------------
 * Adobe Illustrator (ExtendScript)
 *
 * Genera N copias exactas del documento activo como archivos .ai
 * independientes, con numeración secuencial (01, 02, 03...).
 *
 * Opciones al ejecutar:
 *   - Número de copias
 *   - Nombre base de los archivos
 *   - Numeración como prefijo (01_Nombre.ai) o sufijo (Nombre_01.ai)
 *   - Separador, número inicial y número de dígitos
 *   - Carpeta de destino
 *
 * Funcionamiento: copia el archivo .ai guardado en disco tantas veces
 * como se indique. Las copias son idénticas al original (mismas mesas,
 * capas, enlaces y opciones de guardado). El original no se modifica.
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
        if (!confirm("El documento tiene cambios sin guardar.\n\nPara incluirlos en las copias hay que guardarlo ahora. ¿Guardar y continuar?")) {
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

    // ---------------------------------------------------------------
    // Diálogo
    // ---------------------------------------------------------------
    var defaults = {
        count: 5,
        base: baseNameOf(srcFile),
        prefix: false,
        sep: "_",
        start: 1,
        digits: 2,
        folder: srcFile.parent
    };

    var w = new Window("dialog", "Duplicar archivo");
    w.orientation = "column";
    w.alignChildren = "fill";

    w.add("statictext", undefined, "Documento: " + decodeURI(srcFile.name));

    // Copias
    var pCount = w.add("panel", undefined, "Copias");
    pCount.alignChildren = "left";
    var gCount = pCount.add("group");
    gCount.add("statictext", undefined, "Número de copias:");
    var etCount = gCount.add("edittext", undefined, String(defaults.count));
    etCount.characters = 5;

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

    // Vista previa
    var pPrev = w.add("panel", undefined, "Vista previa");
    pPrev.alignChildren = "fill";
    var stPrev = pPrev.add("statictext", undefined, "", { multiline: true });
    stPrev.preferredSize = [420, 80];

    // Botones
    var gBtns = w.add("group");
    gBtns.alignment = "right";
    gBtns.add("button", undefined, "Cancelar", { name: "cancel" });
    var btOk = gBtns.add("button", undefined, "Generar copias", { name: "ok" });

    function readConfig() {
        var cfg = {
            count: parseInt(etCount.text, 10),
            base: cleanName(etBase.text),
            prefix: rbPrefix.value,
            sep: cleanName(etSep.text),
            start: parseInt(etStart.text, 10),
            digits: parseInt(etDigits.text, 10)
        };
        cfg.valid = !isNaN(cfg.count) && cfg.count >= 1 && cfg.count <= 999 &&
                    !isNaN(cfg.start) && cfg.start >= 0 &&
                    !isNaN(cfg.digits) && cfg.digits >= 1 && cfg.digits <= 6 &&
                    cfg.base.length > 0;
        return cfg;
    }

    function updatePreview() {
        var cfg = readConfig();
        if (!cfg.valid) {
            stPrev.text = "Revisa los valores: copias (1-999), número inicial y dígitos deben ser números válidos y el nombre no puede estar vacío.";
            btOk.enabled = false;
            return;
        }
        btOk.enabled = true;
        var lines = [];
        lines.push(cfg.count + " copia(s):");
        var show = Math.min(cfg.count, 3);
        for (var i = 0; i < show; i++) {
            lines.push("   " + buildFileName(cfg, i));
        }
        if (cfg.count > 3) {
            lines.push("   ...");
            lines.push("   " + buildFileName(cfg, cfg.count - 1));
        }
        stPrev.text = lines.join("\n");
    }

    etCount.onChanging = etBase.onChanging = etSep.onChanging =
        etStart.onChanging = etDigits.onChanging = updatePreview;
    rbPrefix.onClick = rbSuffix.onClick = updatePreview;
    updatePreview();

    if (w.show() !== 1) return;

    var cfg = readConfig();
    if (!cfg.valid) return;

    // ---------------------------------------------------------------
    // Validaciones antes de generar
    // ---------------------------------------------------------------
    if (!destFolder.exists) destFolder.create();

    var targets = [];
    var existing = [];
    for (var g = 0; g < cfg.count; g++) {
        var f = new File(destFolder.fsName + "/" + buildFileName(cfg, g));
        if (f.fsName === srcFile.fsName) {
            alert("El archivo \"" + decodeURI(f.name) + "\" coincide con el documento original. Cambia el nombre base, la numeración o la carpeta de destino.");
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
    var progress = new Window("palette", "Duplicando archivo...");
    progress.alignChildren = "fill";
    var bar = progress.add("progressbar", undefined, 0, cfg.count);
    bar.preferredSize.width = 320;
    var stStatus = progress.add("statictext", undefined, "");
    progress.show();

    var created = [];
    var errors = [];

    try {
        for (var k = 0; k < cfg.count; k++) {
            var target = targets[k];
            stStatus.text = decodeURI(target.name);
            progress.update();
            try {
                if (target.exists) target.remove();
                if (!srcFile.copy(target)) throw new Error(srcFile.error || "No se pudo copiar el archivo.");
                created.push(decodeURI(target.name));
            } catch (err) {
                errors.push(decodeURI(target.name) + ": " + err.message);
            }
            bar.value = k + 1;
            progress.update();
        }
    } finally {
        progress.close();
    }

    var msg = "Copias creadas: " + created.length + " de " + cfg.count +
              "\nCarpeta: " + decodeURI(destFolder.fsName);
    if (errors.length > 0) {
        msg += "\n\nErrores:\n" + errors.join("\n");
    }
    alert(msg);

})();
