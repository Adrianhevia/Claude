# Scripts de Illustrator

## SepararMesasEnArchivos.jsx

Divide el documento activo en archivos `.ai` independientes, cada uno con un grupo de N mesas de trabajo consecutivas (por ejemplo 1-2, 3-4, 5-6 con N = 2).

**Uso:** abre el `.ai` y ve a *Archivo > Secuencias de comandos > Otra secuencia de comandos…*, luego elige `SepararMesasEnArchivos.jsx`.

**Opciones del diálogo**

| Opción | Por defecto |
|---|---|
| Mesas de trabajo por archivo | 2 |
| Nombre base | nombre del documento |
| Numeración | sufijo (`Nombre_01.ai`) o prefijo (`01_Nombre.ai`) |
| Separador / Empezar en / Dígitos | `_` / 1 / 2 |
| Carpeta de destino | la del documento original |
| Eliminar contenido fuera de las mesas | activado |
| Compatible con PDF | activado |

**Cómo funciona:** por cada grupo copia el `.ai` original, lo abre, borra las mesas que no son del grupo (y, si está marcado, el arte que queda fuera de ellas) y lo guarda. El original no se toca. Si el total de mesas no es divisible entre N, avisa antes de generar. Si ya existen archivos con esos nombres, pide confirmación para sobrescribirlos.

**Notas**
- El documento tiene que estar guardado como `.ai`. Si tiene cambios sin guardar, el script ofrece guardarlo primero.
- Un objeto que ocupe mesas de dos grupos distintos se conserva en ambos archivos.
- Las mesas conservan su posición original en el lienzo.

## DuplicarArchivo.jsx

Genera N copias exactas del documento activo como archivos `.ai` independientes con numeración secuencial.

**Uso:** abre el `.ai` y ve a *Archivo > Secuencias de comandos > Otra secuencia de comandos…*, luego elige `DuplicarArchivo.jsx`.

**Opciones del diálogo:** número de copias (5 por defecto), nombre base, numeración como sufijo o prefijo, separador, número inicial, dígitos y carpeta de destino. Incluye vista previa de los nombres.

**Cómo funciona:** copia el archivo guardado en disco, así que las copias son idénticas al original y el proceso es inmediato. Si el documento tiene cambios sin guardar, ofrece guardarlo primero. Pide confirmación antes de sobrescribir archivos existentes y no permite que una copia se llame igual que el original.
