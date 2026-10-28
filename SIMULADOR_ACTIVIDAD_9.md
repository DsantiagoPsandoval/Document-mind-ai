# Documentación Oficial del Simulador de Arquitectura y Diseño Técnico — Guía Actividad 9

> **Universidad Libre — Facultad de Ingeniería**  
> **Curso:** Ingeniería Aplicada (Período 2026-2)  
> **Proyecto:** **Document-Mind AI** — Plataforma Cognitiva de Análisis de Documentos, Repositorios AST y Auditoría DevSecOps  
> **Equipo de Ingeniería:**  
> - **Daniel Santiago Palencia Sandoval** — *Líder Tecnológico (CTO)*  
> - **Nelson Andrés Ayala Álvarez** — *Líder de Mercadeo y Negocios (CMO/CBO)*  
> **Enlace Local al Simulador:** [http://localhost:3000/#simulador-arquitectura](http://localhost:3000/#simulador-arquitectura)  
> **Enlace Web Desplegado:** [https://dsantiagopsandoval.github.io/Document-mind-ai/#simulador-arquitectura](https://dsantiagopsandoval.github.io/Document-mind-ai/#simulador-arquitectura)

---

## 1. Configuración del Proyecto (Requisito 1)

El simulador registra y permite parametrizar en tiempo real las características fundamentales de **Document-Mind AI**:

- **Características principales del sistema:** Plataforma full-stack que combina extracción de documentos técnicos (`PDF`, `DOCX`, `TXT`), parseo estático de árboles de sintaxis abstracta (`AST`) sobre repositorios de GitHub, escaneo de vulnerabilidades `DevSecOps` (reglas `SAST` + matriz `STRIDE`) e inferencia generativa con **Google Gemini 2.5 Flash**.
- **Usuarios previstos:** Desarrolladores de software, arquitectos de sistemas, líderes técnicos (`CTOs`/`Tech Leads`) y auditores de calidad/seguridad (`QA`/`DevSecOps`), operando en rangos desde equipos académicos ($10 - 60$ usuarios) hasta despliegues empresariales ($300 - 1,000+$ usuarios concurrentes).
- **Requisitos obligatorios de calidad (SLAs):**
  1. **Latencia Estimada P95 Máxima:** $\le 1,800\text{ ms}$ por operación de análisis/síntesis.
  2. **Disponibilidad Mínima (SLA):** $\ge 99.50\%$ de tiempo activo sin errores de saturación (`HTTP 503`).
  3. **Índice de Escalabilidad Elástica Mínimo:** $\ge 75 / 100$.
  4. **Nivel de Cifrado y Seguridad Mínimo:** $\ge 90 / 100$.
- **Restricciones del proyecto:**
  1. **Presupuesto Mensual Cloud Máximo:** $\$350\text{ USD/mes}$ (ajustable desde $\$10\text{ USD}$ para evaluar escenarios *bootstrapped*).
  2. **Memoria RAM Total del Entorno:** $8.0\text{ GB}$ (ajustable según infraestructura disponible).
  3. **Capacidad operativa del equipo:** $2$ ingenieros responsables de desarrollo, despliegue y mantenimiento (`DevOps`).

---

## 2. Alternativas Arquitectónicas Evaluadas (Requisito 2)

El aplicativo modela y compara **tres (3) alternativas arquitectónicas diferenciadas** bajo condiciones de entrada idénticas, fundamentadas en los cuatro artículos científicos sugeridos en la guía:

| Característica | Alternativa 1: Monolito Modular MVC (`MONOLITH_MVC`) | Alternativa 2: Microservicios en Contenedores (`MICROSERVICES_K8S`) | Alternativa 3: Arquitectura Orientada a Eventos (`EDA_SERVERLESS`) |
| :--- | :--- | :--- | :--- |
| **Diseño Técnico** | Proceso único en `Node.js` + `Express` donde conviven el Gateway, el Parser PDF, el Analizador AST, el Escáner SAST y el cliente Gemini con llamadas en memoria (`0` saltos RPC). | Descomposición en **5 pods independientes** en Kubernetes (`Gateway/Auth`, `DocParser`, `GitHub AST/SAST`, `Gemini AI Orchestrator`, `Cache/Export`) comunicados vía `REST/gRPC`. | Desacoplamiento asíncrono con un **Event Broker** (`Redis Streams` / `RabbitMQ`) y un pool elástico de **Workers Serverless** que procesan eventos `AnalysisRequested`. |
| **Saltos de Red Internos ($H_{hops}$)** | $0\text{ saltos}$ (comunicación directa en memoria RAM). | $4\text{ saltos}$ síncronos en cadena + Service Mesh. | $3\text{ saltos}$ asíncronos (Publicación, Broker y Worker). |
| **Uso de Contenedores** | Bajo ($1$ a $2$ instancias monolíticas). | Alto ($5$ a $10$ pods auto-escalables con `HPA`). | Elástico ($1$ a $16$ contenedores efímeros bajo demanda). |
| **Esquema de Cifrado** | `TLS 1.3` en borde + sanitización en memoria ($92/100$). | `mTLS` estricto (`Istio`) entre pods + `TLS 1.3` + `Vault` ($98/100$). | `TLS 1.3` + cifrado de payload en cola `AES-256-GCM` ($96/100$). |
| **Costo Base Fijo** | $\$24\text{ USD/mes}$ | $\$115\text{ USD/mes}$ | $\$55\text{ USD/mes}$ |

---

## 3. Variables de Entrada y su Relación con el Modelo (Requisito 3)

El usuario puede modificar interactivamente **cinco (5) variables de entrada** (superando el mínimo de 3 exigido):

1. **Usuarios Concurrentes ($U \in [1, 5000]$):** Determina la tasa de llegada de transacciones ($\lambda$) al sistema. Afecta directamente el factor de congestión ($\rho$), la longitud de la cola de espera, el consumo de memoria RAM por sesión y el disparo del auto-escalador de contenedores.
2. **Tamaño Promedio de Carga / Documento ($S_{MB} \in [0.1, 20.0]\text{ MB}$):** Representa el peso de los archivos `.pdf`, `.docx` o `.zip` cargados. Incrementa linealmente el tiempo de extracción en CPU y penaliza a las arquitecturas distribuidas por el costo de serialización/deserialización de red entre servicios.
3. **Complejidad del Repositorio ($N_{files} \in [5, 2000]\text{ archivos}$):** Cantidad de archivos de código analizados por el motor estático `AST` y las reglas `SAST` (`CWE`/`OWASP`). En el monolito, un $N_{files}$ elevado bloquea el *Event-Loop* de `Node.js`.
4. **Nivel de Profundidad Cognitiva IA ($IA \in \{1, 2, 3\}$):** Define si se ejecuta análisis heurístico determinista ($1$), síntesis estándar con Gemini 2.5 Flash ($2$), o suite completa con diagramas C4 + matriz de amenazas `STRIDE` ($3$).
5. **Factor de Ráfaga de Tráfico ($B \in [1.0, 5.0]\times$):** Modela picos repentinos de carga (como entregas simultáneas o *webhooks* masivos de `git push`), poniendo a prueba la elasticidad de los contenedores y el amortiguamiento por colas.

---

## 4. Modelo Matemático de Simulación, Supuestos y Limitaciones (Requisito 4)

### 4.1 Ecuaciones Implementadas en [`services/simulator/architectureSimulator.js`](services/simulator/architectureSimulator.js)

1. **Tasa Efectiva de Llegada ($\lambda$):**
   $$\lambda = \left(\frac{U}{12}\right) \times B \quad [\text{req/s}]$$

2. **Tiempo de Cómputo Base ($T_{base}$):**
   $$T_{base} = \left(45 + 1.45 \cdot N_{files} + 26.0 \cdot S_{MB} + T_{IA}\right) \times \alpha_{arq} \quad [\text{ms}]$$
   Donde $\alpha_{arq}$ refleja el paralelismo interno ($\text{Monolito}=1.0$, $\text{Microservicios}=0.78$, $\text{EDA}=0.65$).

3. **Penalización de Serialización y Saltos de Red ($T_{net}$ — Modelo Al-Debagy & Martinek):**
   $$T_{net} = H_{hops} \times \left(L_{hop} + 2.8 \cdot S_{MB} + 0.04 \cdot N_{files}\right) \quad [\text{ms}]$$
   Como el Monolito tiene $H_{hops} = 0$, su penalización de red interna es exactamente $0\text{ ms}$.

4. **Auto-Escalado de Contenedores ($c$) y Utilización del Sistema ($\rho$):**
   $$\mu_{nodo} = \frac{\mu_{base}}{1 + 0.085 \cdot S_{MB} + \frac{N_{files}}{350} + 0.18 \cdot IA}$$
   $$c = \min\left(c_{max}, \max\left(1, \left\lceil \frac{\lambda}{0.72 \cdot \mu_{nodo}} \right\rceil\right)\right), \qquad \rho = \frac{\lambda}{c \cdot \mu_{nodo}}$$

5. **Degradación de Cola No Lineal ($T_{cola}$ — Aproximación Kingman / Estrés JMeter):**
   - Si $\rho \le 0.65$: $T_{cola} = 0.12 \cdot T_{base} \cdot \rho^2$
   - Si $0.65 < \rho \le 0.95$: $T_{cola} = T_{base} \cdot \left(0.25 + 0.18 \cdot \left(\frac{\rho}{1.05 - \rho}\right)^{1.35}\right)$
   - Si $\rho > 0.95$ (Saturación): crece con pendiente severa en el Monolito ($M_{sat}=1450$) por bloqueo del *Event-Loop*, moderada en Microservicios ($680$) y amortiguada en EDA ($420$).

6. **Función de Decisión Multicriterio Explicable (SAW con Penalización de Restricciones):**
   $$\text{Score} = \sum_{i=1}^{5} w_i \cdot I_i - P_{\text{SLA/Presupuesto}}$$

### 4.2 Supuestos y Limitaciones del Modelo
- **Supuestos:** Se asume que las peticiones siguen un proceso de llegada estacionario por intervalos, que los contenedores disponen de ancho de banda constante dentro del clúster y que el proveedor externo Google Gemini API mantiene una latencia base acotada.
- **Limitaciones:** El modelo es analítico de estado estacionario y no simula fallos aleatorios de hardware físico, corrupción de paquetes TCP ni latencias geográficas intercontinentales de clientes móviles con redes 3G/4G inestables.

---

## 5. Escenarios de Ejecución y Comparación (Requisitos 5, 6 y 7)

El simulador calcula **8 indicadores cuantificables** (Latencia P95, Throughput/Capacidad, Escalabilidad, Disponibilidad SLA, CPU %, Memoria RAM, Paquetes de Red/s, y Costo/Cifrado/Contenedores) a través del **Escenario de Referencia** y **3 escenarios contrastantes**:

| Escenario | Variables de Entrada ($U, S_{MB}, N_{files}, IA, B$) | Latencia Monolito | Latencia Micros (K8s) | Latencia EDA | Arquitectura Recomendada (#1) |
| :--- | :--- | :---: | :---: | :---: | :--- |
| **0. Referencia (Operación Normal)** | $U=60, S=2.5\text{MB}, N=85, IA=2, B=1.2\times$ | $471\text{ ms}$ | $415\text{ ms}$ | $375\text{ ms}$ | **Monolito Modular MVC** (Mayor eficiencia costo/RAM y cumple todos los SLAs) |
| **1. Baja Carga / 1 Nodo (Literatura)** | $U=18, S=1.0\text{MB}, N=35, IA=1, B=1.0\times$ | **$160\text{ ms}$** | $180\text{ ms}$ | $226\text{ ms}$ | **Monolito Modular MVC** ($0\text{ ms}$ red interna y solo $211\text{ MB}$ RAM) |
| **2. Escala Empresarial B2B** | $U=320, S=6.0\text{MB}, N=240, IA=2, B=1.6\times$ | $2,395\text{ ms}$ (Saturado) | $682\text{ ms}$ | **$581\text{ ms}$** | **Orientada a Eventos (EDA) / Microservicios K8s** (El Monolito incumple SLA) |
| **3. Estrés Extremo (JMeter Push)** | $U=650, S=14.0\text{MB}, N=420, IA=3, B=2.5\times$ | $10,879\text{ ms}$ (Colapso) | $2,368\text{ ms}$ | **$1,089\text{ ms}$** | **Orientada a Eventos (EDA)** ($99.88\%$ SLA con $16$ workers asíncronos) |

---

## 6. Validación, Controles y Cinco (5) Pruebas Documentadas (Requisito 10)

Todas las pruebas están automatizadas en [`tests/test_api.js`](tests/test_api.js) y se ejecutan con `npm test`:

1. **`TEST-SIM-01` (Superioridad del Monolito en Baja Concurrencia):** Verifica que con $U=18, S=1.0\text{ MB}, N=35$, el Monolito obtiene menor latencia ($160\text{ ms} < 180\text{ ms}$) y menor memoria ($211\text{ MB} < 765\text{ MB}$) que Microservicios, recomendando `MONOLITH_MVC`.
2. **`TEST-SIM-02` (Saturación del Monolito en Escala Empresarial):** Verifica que con $U=320, S=6.0\text{ MB}, N=240$, el Monolito supera el $95\%$ de utilización de cola y su latencia se dispara, transfiriendo la recomendación a las arquitecturas distribuidas.
3. **`TEST-SIM-03` (Resiliencia de EDA en Prueba de Estrés Extremo):** Verifica que con $U=650, S=14.0\text{ MB}, N=420, B=2.5\times$, la arquitectura `EDA_SERVERLESS` mantiene la mayor disponibilidad ($99.88\%$) y gana la evaluación multicriterio.
4. **`TEST-SIM-04` (Sensibilidad a Restricciones Presupuestarias Obligatorias):** Verifica que al reducir el presupuesto máximo a $\$45\text{ USD/mes}$, la alternativa `MICROSERVICES_K8S` ($\$115+\text{ USD/mes}$) marca `budgetOk = false` y recibe una penalización de $12\text{ puntos}$ en su calificación final.
5. **`TEST-SIM-05` (Detección y Rechazo de Entradas Inválidas):** Verifica tanto en la función `validateSimulationInput()` como en el endpoint `POST /api/simulator/run` que entradas fuera de rango ($U=-20$, $S_{MB}=55\text{ MB}$, $N_{files}=0$) son bloqueadas con estado `HTTP 400` y mensajes detallados de validación.

---

## 7. Guía para la Sustentación e Información para Validación Real (Requisito 12)

### Pasos para la Demostración en Clase (Sustentación):
1. Abrir la plataforma en [http://localhost:3000/#simulador-arquitectura](http://localhost:3000/#simulador-arquitectura).
2. Mostrar el **Escenario de Referencia** activo y explicar cómo se registran los usuarios previstos, los requisitos de calidad (SLAs) y el presupuesto en el panel izquierdo.
3. Presionar el botón **"1. Baja Carga / 1 Nodo (18 u)"** para demostrar cómo el Monolito gana en latencia ($160\text{ ms}$) y consumo de RAM ($211\text{ MB}$), coincidiendo con los artículos científicos del curso.
4. Mover el deslizador de **Usuarios Concurrentes ($U$)** hacia $400+$ o presionar **"3. Estrés JMeter (650 u / 14MB)"** para evidenciar en vivo cómo se satura la cola del Monolito y cómo la recomendación explicable cambia automáticamente a **Arquitectura Orientada a Eventos (EDA)** o **Microservicios (K8s)**.
5. Presionar **"Probar Control Entrada Inválida"** para demostrar los controles de validación del Requisito 10.

### ¿Qué información adicional se requeriría para validar las conclusiones en una aplicación real?
Los valores entregados por el simulador son **estimaciones matemáticas del modelo**. Para validarlos empíricamente en producción se requiere:
1. **Pruebas de Carga con Apache JMeter / k6:** Ejecutar planes de prueba inyectando archivos PDF y repositorios ZIP reales sobre contenedores con límites de hardware idénticos (`2 vCPU`, `4 GB RAM`).
2. **Telemetría APM Real (OpenTelemetry + Prometheus):** Medir el *Event-Loop Lag* en milisegundos de `Node.js`, los tiempos reales de serialización `gRPC/REST` y la distribución real de percentiles $P_{50}, P_{95}, P_{99}$.
3. **Auditoría de Facturación Cloud Real:** Medir el costo efectivo de transferencia de datos entre zonas de disponibilidad (tráfico Este-Oeste en Kubernetes) y el consumo de tokens de la API de Google Gemini durante un ciclo mensual continuo.
