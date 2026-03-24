"""
pdf_to_html.py
Extrae el contenido de los PDFs de acordes manteniendo la posición
horizontal de los acordes sobre la letra usando <pre> con fuente monoespaciada.

Uso: python pdf_to_html.py
Genera: songs_data.js  (se incluye en acordes.html)
"""

import os
import json
import re
import pdfplumber

# === CONFIGURACIÓN ===
FOLDERS = {
    "populares": "Cancionero Popular",
    "dios": "Canciones para Dios Word"
}
OUTPUT_JS = "songs_data.js"

def extract_pdf_to_html(pdf_path, pdf_file):
    """
    Extrae el texto de un PDF preservando la alineación de acordes
    sobre las letras usando análisis de coordenadas X de cada palabra.
    Devuelve HTML listo para insertar en el visor.
    """
    try:
        html_pages = []
        with pdfplumber.open(pdf_path) as pdf:
            for page in pdf.pages:
                # Extraemos palabras con sus coordenadas
                words = page.extract_words(
                    x_tolerance=3,
                    y_tolerance=3,
                    keep_blank_chars=False,
                    use_text_flow=False
                )
                if not words:
                    continue

                # Agrupamos palabras por línea (y0 similar = misma línea)
                lines = {}
                for word in words:
                    y_key = round(word["top"] / 5) * 5  # agrupar en bloques de 5px
                    if y_key not in lines:
                        lines[y_key] = []
                    lines[y_key].append(word)

                # Ordenamos las líneas por posición vertical
                sorted_ys = sorted(lines.keys())

                # Calculamos la escala: cuántos caracteres por punto horizontal
                # Asumimos que la página tiene ~80 chars de ancho a page.width pts
                PAGE_WIDTH = page.width or 595
                CHARS = 90  # ancho en caracteres de la fuente mono
                scale = CHARS / PAGE_WIDTH

                pre_lines = []
                for y in sorted_ys:
                    row_words = sorted(lines[y], key=lambda w: w["x0"])
                    # Construimos la línea como texto con espacios para preservar posición
                    char_line = [" "] * CHARS
                    for word in row_words:
                        col = int(word["x0"] * scale)
                        text = word["text"]
                        end = min(col + len(text), CHARS)
                        for i, ch in enumerate(text):
                            pos = col + i
                            if pos < CHARS:
                                char_line[pos] = ch
                    pre_lines.append("".join(char_line).rstrip())

                # Juntamos líneas consecutivas vacías en una sola
                cleaned = []
                prev_empty = False
                for line in pre_lines:
                    is_empty = line.strip() == ""
                    if is_empty and prev_empty:
                        continue
                    cleaned.append(line)
                    prev_empty = is_empty

                # Limpieza de instrucciones previas al título (solo primera página)
                if len(html_pages) == 0 and cleaned:
                    name_clean = re.sub(r'\d+$', '', pdf_file[:-4])
                    name_clean = name_clean.replace('(', ' ').replace(')', ' ')
                    name_words = [w.lower() for w in name_clean.split() if w.isalpha() and len(w) > 1]
                    if not name_words:
                        name_words = [w.lower() for w in name_clean.split()]

                    start_idx = 0
                    for idx, line in enumerate(cleaned):
                        line_lower = line.lower()
                        matches = sum(1 for w in name_words if w in line_lower)
                        if matches > 0 and (matches >= len(name_words)/2 or name_words[0] in line_lower):
                            start_idx = idx
                            break
                    cleaned = cleaned[start_idx:]

                # Escapamos HTML y envolvemos en <pre>
                escaped = "\n".join(
                    ln.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")
                    for ln in cleaned
                )
                html_pages.append(f'<pre class="chord-sheet">{escaped}</pre>')

        return "<hr class=\"page-break\">".join(html_pages) if html_pages else ""

    except Exception as e:
        print(f"  ERROR en {pdf_path}: {e}")
        return ""


def main():
    songs_html = {}  # { "categoria/nombre": "html_content" }
    total = 0
    errors = 0

    for cat_key, folder in FOLDERS.items():
        if not os.path.isdir(folder):
            print(f"!!! Carpeta no encontrada: {folder}")
            continue

        pdfs = [f for f in os.listdir(folder) if f.endswith(".pdf")]
        print(f"\nProcesando {folder}  ({len(pdfs)} PDFs)")

        for pdf_file in sorted(pdfs):
            pdf_path = os.path.join(folder, pdf_file)
            print(f"  -> {pdf_file[:60]}...", end=" ", flush=True)
            html = extract_pdf_to_html(pdf_path, pdf_file)
            if html:
                key = f"{cat_key}/{pdf_file}"
                songs_html[key] = html
                total += 1
                print("OK")
            else:
                errors += 1
                print("ERROR")

    # Guardamos como archivo JS que el HTML puede importar
    with open(OUTPUT_JS, "w", encoding="utf-8") as f:
        f.write("// Generado automáticamente por pdf_to_html.py\n")
        f.write("// Contiene el texto HTML de cada canción extraído del PDF\n\n")
        f.write("const songsHtmlData = ")
        json.dump(songs_html, f, ensure_ascii=False, indent=2)
        f.write(";\n")

    print(f"\nCompletado! {total} canciones exportadas -> {OUTPUT_JS}")
    if errors:
        print(f"ATENCION: {errors} PDFs con errores")


if __name__ == "__main__":
    main()
