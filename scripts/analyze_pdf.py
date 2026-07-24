import pikepdf # pikepdf
import sys

def analyze_pdf(pdf_path):
    try:
        pdf = pikepdf.open(pdf_path)
    except Exception as e:
        print(f"Ошибка при открытии PDF: {e}")
        return

    image_size = 0
    font_size = 0
    other_size = 0
    obj_count = 0

    # Проходимся по всем внутренним объектам PDF
    for obj in pdf.objects:
        if isinstance(obj, pikepdf.Stream):
            try:
                # Получаем размер сырых данных объекта в байтах
                length = len(obj.read_raw_bytes())
                obj_count += 1
                
                # Проверяем, является ли объект картинкой
                if '/Subtype' in obj and str(obj['/Subtype']) == '/Image':
                    image_size += length
                # Проверяем, является ли объект шрифтом
                elif '/Subtype' in obj and 'Type1' in str(obj.get('/Subtype', '')):
                    font_size += length
                elif '/Font' in str(obj):
                    font_size += length
                # Все остальное (векторная графика, текст, скрипты)
                else:
                    other_size += length
            except Exception:
                pass

    print("\n" + "="*30)
    print("📊 АНАЛИЗ PDF ФАЙЛА:")
    print("="*30)
    print(f"Всего объектов: {obj_count}")
    print(f"🖼 Изображения:  {image_size / 1024 / 1024:.2f} МБ")
    print(f"🔤 Шрифты:       {font_size / 1024 / 1024:.2f} МБ")
    print(f"📝 Вектор/Текст: {other_size / 1024 / 1024:.2f} МБ")
    print("="*30)
    
    total = image_size + font_size + other_size
    print(f"📦 Итого данных: {total / 1024 / 1024:.2f} МБ")
    print(f"📄 Размер файла: {sys.getsizeof(open(pdf_path, 'rb').read()) / 1024 / 1024:.2f} МБ\n")

if __name__ == "__main__":
    if len(sys.argv) < 2:
        pdf_file = input("Введите путь к PDF файлу: ").strip('"').strip("'")
    else:
        pdf_file = sys.argv[1]
    
    if pdf_file:
        analyze_pdf(pdf_file)
