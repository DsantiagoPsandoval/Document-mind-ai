import os
import sys
import subprocess
import qrcode
import qrcode.image.svg

if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')

print('Iniciando construccion y verificacion de DocuMind AI...')
os.makedirs('assets', exist_ok=True)

# 1. Generar Codigos QR de alta resolucion
url = 'https://documind-ai.github.io/launch/'
factory = qrcode.image.svg.SvgPathImage
img_svg = qrcode.make(url, image_factory=factory, box_size=10, border=2)
img_svg.save('assets/qr-landing.svg')

img_png = qrcode.make(url, box_size=10, border=2)
img_png.save('assets/qr-landing.png')
print('[OK] Codigos QR generados exitosamente en /assets')

# 2. Generar Infografia PDF
print('Generando Infografia PDF Oficial...')
res = subprocess.run([sys.executable, 'generate_pdf.py'], capture_output=True, text=True)
print(res.stdout)
if res.stderr:
    print(res.stderr)

print('[OK] Construccion finalizada con exito!')
