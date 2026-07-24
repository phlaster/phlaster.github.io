import fitz  # PyMuPDF
import sys
import os

def analyze_images(pdf_path):
    if not os.path.exists(pdf_path):
        print(f"Файл не найден: {pdf_path}")
        return

    try:
        doc = fitz.open(pdf_path)
    except Exception as e:
        print(f"Ошибка открытия PDF: {e}")
        return

    print("\n" + "=" * 85)
    print(f"{'Стр.':<5} | {'XREF':<6} | {'Размер (px)':<14} | {'Цветовая':<10} | {'Вес в PDF':<10} | {'Сырой вес (в ОЗУ)':<18}")
    print("-" * 85)

    total_compressed = 0
    total_raw = 0
    seen_xrefs = set()

    for page_num, page in enumerate(doc, start=1):
        image_list = page.get_images(full=True)
        
        for img in image_list:
            xref = img[0]
            
            # Пропускаем дубликаты, если картинка использовалась на нескольких страницах
            if xref in seen_xrefs:
                continue
            seen_xrefs.add(xref)

            try:
                # Извлекаем метаданные и байты картинки
                img_info = doc.extract_image(xref)
                width = img_info["width"]
                height = img_info["height"]
                colorspace_n = img_info["colorspace"]
                bpc = img_info.get("bpc", 8)
                img_bytes = img_info["image"]

                # Определяем цветовую модель
                cs_name = {1: "Gray", 3: "RGB", 4: "CMYK"}.get(colorspace_n, f"{colorspace_n}Ch")
                comps = colorspace_n

                # Считаем сырой вес (несжатый битмап в памяти: ширина * высота * каналы * байт на канал)
                raw_size = width * height * comps * (bpc / 8)
                compressed_size = len(img_bytes)

                total_raw += raw_size
                total_compressed += compressed_size

                dims = f"{width}x{height}"
                raw_str = f"{raw_size / 1024 / 1024:.2f} МБ"
                comp_str = f"{compressed_size / 1024 / 1024:.2f} МБ"

                print(f"{page_num:<5} | {xref:<6} | {dims:<14} | {cs_name:<10} | {comp_str:<10} | {raw_str:<18}")
            except Exception as e:
                print(f"{page_num:<5} | {xref:<6} | Ошибка извлечения: {e}")

    print("=" * 85)
    print(f"{'ИТОГО:':<49} | {total_compressed / 1024 / 1024:.2f} МБ | {total_raw / 1024 / 1024:.2f} МБ")
    print("=" * 85 + "\n")

if __name__ == "__main__":
    if len(sys.argv) < 2:
        pdf_file = input("Перетащите PDF сюда или введите путь: ").strip('"').strip("'")
    else:
        pdf_file = sys.argv[1]
    
    if pdf_file:
        analyze_images(pdf_file)
