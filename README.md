# DocuMind AI — Documentación Automática de Repositorios con Inteligencia Artificial

> **Iniciativa de Emprendimiento de Base Tecnológica**  
> **Universidad Libre — Facultad de Ingeniería**  
> **Asignatura:** Ingeniería Aplicada / Emprendimiento Tecnológico

---

## 👥 Equipo Empresarial & Roles
- **Daniel Santiago Palencia Sandoval** — *Líder Tecnológico (CTO)*
  - **Correo:** [daniels-palencias@unilibre.edu.co](mailto:daniels-palencias@unilibre.edu.co)
  - **GitHub:** [https://github.com/DsantiagoPsandoval](https://github.com/DsantiagoPsandoval)
  - **LinkedIn:** [https://www.linkedin.com/in/daniel-palencia-palencia-sandoval-b49279351/](https://www.linkedin.com/in/daniel-palencia-palencia-sandoval-b49279351/)
  - *Funciones:* Diseño de la arquitectura técnica del MVP (AST + Modelos de IA Generativa), desarrollo del pipeline de CI/CD (GitHub Actions / CLI) y validación de precisión con repositorios reales.
- **Nelson Andrés Ayala Álvarez** — *Líder de Mercadeo & Desarrollo de Negocios (CMO/CBO)*
  - **Correo:** [nelsona-ayalaa@unilibre.edu.co](mailto:nelsona-ayalaa@unilibre.edu.co)
  - **GitHub:** [https://github.com/nexker](https://github.com/nexker)
  - **LinkedIn:** [https://www.linkedin.com/in/nelson-ayala-11719a352](https://www.linkedin.com/in/nelson-ayala-11719a352)
  - *Funciones:* Construcción y despliegue de la Landing Page interactiva, adquisición de early adopters, entrevistas de validación con Tech Leads/CTOs y estructuración del modelo SaaS B2B.

---

## 🚀 Entregables del Proyecto

### 1. Landing Page Interactiva (`index.html`)
- **Propuesta de valor clara:** "Tu código cambia todos los días. Tu documentación ahora también."
- **Problemática Reto HIT:** 20% de tiempo improductivo, fricción en onboarding y drift de documentación.
- **Prototipo en vivo / Simulador AST:** Terminal interactiva con simulación en tiempo real de parseo AST, detección de endpoints y generación de especificaciones OpenAPI y diagramas C4.
- **Formulario de Registro de Early Adopters:** Almacenamiento local interactivo con telemetría en vivo.
- **Contador Estadístico de Visitantes:** Simulación de tráfico en tiempo real y métricas de validación empírica (86% dolor validado, 83.3% intención de pago).
- **Enlaces Institucionales:** Universidad Libre, GitHub, Discord, LinkedIn.

### 2. Infografía Oficial en Formato PDF (`DocuMind_AI_Infografia_Color_UXUI.pdf`)
- **Teoría del Color Aplicada:**
  - Paleta cromática: *Midnight Dark (`#090D16`)*, *Deep Slate (`#0F172A`)*, *Tech Cyan (`#38BDF8`)*, *Emerald Sync (`#34D399`)*, *Indigo Logic (`#818CF8`)*.
  - Psicología del color para herramientas de desarrollo (reducción de fatiga visual 38%).
  - Cumplimiento de accesibilidad **WCAG 2.1 AAA** (ratios de contraste superiores a 7.2:1).
- **Fundamentos de Diseño UX/UI:**
  - Heurísticas de Usabilidad de Jakob Nielsen (#1 Visibilidad de estado, #2 Correspondencia con mundo real, #4 Consistencia, #5 Prevención de errores).
  - Arquitectura de información (Patrones F & Z, Ley de Miller, Micro-interacciones, Atomic Design System).
- **Código QR Integrado:** Código QR escaneable (`assets/qr-landing.png`) que direcciona a la Landing Page.
- **Lineamientos Pedagógicos:** Diseñado bajo las directrices de la Universidad Libre y la metodología HubSpot para infografías efectivas.

---

## 💻 ¿Cómo abrir y visualizar el proyecto en VS Code?

### Opción 1: Con la extensión Live Server (Recomendada)
1. Abre esta carpeta en **Visual Studio Code**: `Archivo` > `Abrir carpeta...` > selecciona `IngenieriaAplicada`.
2. Haz clic derecho sobre `index.html` y selecciona **"Open with Live Server"**.
3. Tu navegador predeterminado abrirá la Landing Page en `http://127.0.0.1:5500/index.html`.

### Opción 2: Abrir directamente desde el navegador o terminal
- Simplemente haz doble clic sobre `index.html` en el explorador de archivos.
- O ejecuta desde la terminal de VS Code:
  ```powershell
  Start-Process index.html
  ```

### Opción 3: Visualizar la Infografía
- Abre el archivo `DocuMind_AI_Infografia_Color_UXUI.pdf` con cualquier visor de PDF o extensión de VS Code.
- O abre la versión web de la infografía ejecutando:
  ```powershell
  Start-Process infografia.html
  ```

---

## 🛠️ Regeneración de Archivos (Scripts)
Si deseas regenerar el PDF o los códigos QR desde cero:
```powershell
python generate_pdf.py
```
o
```powershell
python build_site.py
```
