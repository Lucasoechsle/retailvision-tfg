"""
Genera el documento DOCX de la Entrega 1 del TFG con el formato requerido:
- Fuente: Times New Roman 12pt (cuerpo), 14pt negrita centrado (títulos)
- Interlineado: 1.5 líneas
- Sangría primera línea: 1.27 cm
- Alineación: justificada
"""

from docx import Document
from docx.shared import Pt, Cm, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.enum.table import WD_TABLE_ALIGNMENT
from docx.oxml.ns import qn
import re


def set_line_spacing(paragraph, spacing=1.5):
    pf = paragraph.paragraph_format
    pf.line_spacing = spacing


def add_titulo(doc, text):
    p = doc.add_paragraph()
    p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    run = p.add_run(text)
    run.bold = True
    run.font.name = "Times New Roman"
    run.font.size = Pt(14)
    run._element.rPr.rFonts.set(qn("w:eastAsia"), "Times New Roman")
    set_line_spacing(p)
    p.paragraph_format.space_after = Pt(12)
    p.paragraph_format.space_before = Pt(24)


def add_subtitulo(doc, text):
    p = doc.add_paragraph()
    p.alignment = WD_ALIGN_PARAGRAPH.LEFT
    run = p.add_run(text)
    run.italic = True
    run.font.name = "Times New Roman"
    run.font.size = Pt(12)
    run._element.rPr.rFonts.set(qn("w:eastAsia"), "Times New Roman")
    set_line_spacing(p)
    p.paragraph_format.space_after = Pt(6)
    p.paragraph_format.space_before = Pt(18)


def add_parrafo(doc, text, bold_prefix=None, indent=True):
    p = doc.add_paragraph()
    p.alignment = WD_ALIGN_PARAGRAPH.JUSTIFY
    if indent:
        p.paragraph_format.first_line_indent = Cm(1.27)

    if bold_prefix:
        run_b = p.add_run(bold_prefix)
        run_b.bold = True
        run_b.font.name = "Times New Roman"
        run_b.font.size = Pt(12)
        run_b._element.rPr.rFonts.set(qn("w:eastAsia"), "Times New Roman")
        run_n = p.add_run(text)
        run_n.font.name = "Times New Roman"
        run_n.font.size = Pt(12)
        run_n._element.rPr.rFonts.set(qn("w:eastAsia"), "Times New Roman")
    else:
        run = p.add_run(text)
        run.font.name = "Times New Roman"
        run.font.size = Pt(12)
        run._element.rPr.rFonts.set(qn("w:eastAsia"), "Times New Roman")

    set_line_spacing(p)
    p.paragraph_format.space_after = Pt(6)


def add_bullet(doc, text, bold_prefix=None, level=0):
    p = doc.add_paragraph()
    p.alignment = WD_ALIGN_PARAGRAPH.JUSTIFY
    p.paragraph_format.left_indent = Cm(1.27 + level * 0.63)
    p.paragraph_format.first_line_indent = Cm(-0.63)

    bullet = "• " if level == 0 else "◦ "

    if bold_prefix:
        run_b = p.add_run(bullet + bold_prefix)
        run_b.bold = True
        run_b.font.name = "Times New Roman"
        run_b.font.size = Pt(12)
        run_b._element.rPr.rFonts.set(qn("w:eastAsia"), "Times New Roman")
        run_n = p.add_run(text)
        run_n.font.name = "Times New Roman"
        run_n.font.size = Pt(12)
        run_n._element.rPr.rFonts.set(qn("w:eastAsia"), "Times New Roman")
    else:
        run = p.add_run(bullet + text)
        run.font.name = "Times New Roman"
        run.font.size = Pt(12)
        run._element.rPr.rFonts.set(qn("w:eastAsia"), "Times New Roman")

    set_line_spacing(p)
    p.paragraph_format.space_after = Pt(2)


def add_numbered(doc, number, text):
    p = doc.add_paragraph()
    p.alignment = WD_ALIGN_PARAGRAPH.JUSTIFY
    p.paragraph_format.left_indent = Cm(1.27)
    p.paragraph_format.first_line_indent = Cm(-0.63)

    run = p.add_run(f"{number}. {text}")
    run.font.name = "Times New Roman"
    run.font.size = Pt(12)
    run._element.rPr.rFonts.set(qn("w:eastAsia"), "Times New Roman")

    set_line_spacing(p)
    p.paragraph_format.space_after = Pt(4)


def add_table(doc, headers, rows):
    table = doc.add_table(rows=1 + len(rows), cols=len(headers))
    table.style = "Table Grid"
    table.alignment = WD_TABLE_ALIGNMENT.CENTER

    for i, header in enumerate(headers):
        cell = table.rows[0].cells[i]
        cell.text = ""
        p = cell.paragraphs[0]
        run = p.add_run(header)
        run.bold = True
        run.font.name = "Times New Roman"
        run.font.size = Pt(10)
        p.alignment = WD_ALIGN_PARAGRAPH.CENTER
        shading = cell._element.get_or_add_tcPr()
        shading_el = shading.makeelement(qn("w:shd"), {
            qn("w:fill"): "D9E2F3",
            qn("w:val"): "clear",
        })
        shading.append(shading_el)

    for r_idx, row in enumerate(rows):
        for c_idx, cell_text in enumerate(row):
            cell = table.rows[r_idx + 1].cells[c_idx]
            cell.text = ""
            p = cell.paragraphs[0]
            run = p.add_run(str(cell_text))
            run.font.name = "Times New Roman"
            run.font.size = Pt(10)

    doc.add_paragraph()


def add_proceso(doc, nombre, roles, pasos, problematica):
    add_parrafo(doc, "", bold_prefix=f"Proceso: {nombre}", indent=False)
    add_parrafo(doc, roles, bold_prefix="Roles: ", indent=False)
    add_parrafo(doc, "", bold_prefix="Pasos actuales:", indent=False)
    for i, paso in enumerate(pasos, 1):
        add_numbered(doc, i, paso)
    add_parrafo(doc, problematica, bold_prefix="Problemática: ", indent=False)
    doc.add_paragraph()


def build_document():
    doc = Document()

    style = doc.styles["Normal"]
    font = style.font
    font.name = "Times New Roman"
    font.size = Pt(12)
    style.paragraph_format.line_spacing = 1.5

    for section in doc.sections:
        section.top_margin = Cm(2.5)
        section.bottom_margin = Cm(2.5)
        section.left_margin = Cm(3)
        section.right_margin = Cm(2.5)

    # ============================================================
    # PORTADA
    # ============================================================
    for _ in range(6):
        doc.add_paragraph()

    p = doc.add_paragraph()
    p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    run = p.add_run("TRABAJO FINAL DE GRADUACIÓN")
    run.bold = True
    run.font.name = "Times New Roman"
    run.font.size = Pt(16)

    doc.add_paragraph()

    p = doc.add_paragraph()
    p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    run = p.add_run(
        "Plataforma de Retail Intelligence basada en Computer Vision\n"
        "y Edge Computing para la Optimización Comercial\n"
        "de Grandes Superficies"
    )
    run.bold = True
    run.font.name = "Times New Roman"
    run.font.size = Pt(14)

    for _ in range(4):
        doc.add_paragraph()

    p = doc.add_paragraph()
    p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    run = p.add_run("Entrega 1")
    run.font.name = "Times New Roman"
    run.font.size = Pt(14)

    doc.add_paragraph()

    p = doc.add_paragraph()
    p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    run = p.add_run("Abril 2026")
    run.font.name = "Times New Roman"
    run.font.size = Pt(12)

    doc.add_page_break()

    # ============================================================
    # INTRODUCCIÓN
    # ============================================================
    add_titulo(doc, "Introducción")

    add_parrafo(doc,
        "El presente Trabajo Final de Graduación aborda el diseño e implementación de una plataforma "
        "de software denominada RetailVision, orientada al análisis del comportamiento del consumidor "
        "dentro de grandes superficies comerciales mediante técnicas de visión por computadora y "
        "procesamiento en el borde (edge computing). El proyecto se desarrolla como una solución "
        "genérica aplicable a cualquier organización del sector retail que opere locales de gran "
        "superficie, tales como supermercados, hipermercados y tiendas departamentales."
    )

    add_parrafo(doc,
        "La plataforma propuesta transforma cámaras de video convencionales en sensores inteligentes "
        "capaces de detectar, rastrear y analizar el flujo de personas dentro de un establecimiento "
        "comercial. A diferencia de las soluciones existentes en el mercado, que operan como sistemas "
        "propietarios cerrados y de alto costo, RetailVision plantea una arquitectura modular, escalable "
        "y accesible que procesa el video localmente en el dispositivo —sin enviar imágenes a la nube— "
        "garantizando así la privacidad de los consumidores."
    )

    add_parrafo(doc,
        "El sistema se compone de tres capas: un dispositivo de borde (edge device) que ejecuta modelos "
        "de detección de objetos en tiempo real, un backend en la nube que almacena y procesa las "
        "métricas agregadas, y un dashboard web que permite a los tomadores de decisión visualizar "
        "indicadores, recibir alertas y obtener recomendaciones accionables. El objetivo final es dotar "
        "a las grandes superficies de información equivalente a la que el comercio electrónico obtiene "
        "de forma nativa: cuántas personas ingresan, qué recorren, dónde se detienen, con qué "
        "interactúan y qué compran."
    )

    # Antecedentes
    add_subtitulo(doc, "Antecedentes")

    add_parrafo(doc,
        "La industria del retail ha experimentado una transformación significativa en la última década "
        "impulsada por la digitalización del comercio. Mientras que las plataformas de comercio electrónico "
        "disponen de herramientas avanzadas de analítica —como tasas de conversión por página, mapas de "
        "calor de clics, análisis de carrito abandonado y segmentación de usuarios—, las tiendas físicas "
        "tradicionalmente han dependido de datos limitados provenientes de los sistemas de punto de venta "
        "(POS), que solo registran lo que el cliente efectivamente compró, sin visibilidad alguna sobre el "
        "comportamiento previo a la compra (Verhoef et al., 2015)."
    )

    add_parrafo(doc,
        "Los primeros intentos por cerrar esta brecha informativa surgieron con los contadores de personas "
        "basados en sensores infrarrojos y alfombras de presión en la década de 1990. Estos dispositivos "
        "ofrecían un conteo básico de entradas y salidas pero carecían de capacidad para rastrear el "
        "movimiento dentro del local. Posteriormente, la introducción de balizas Bluetooth (beacons) y "
        "el análisis de señales Wi-Fi permitieron una aproximación al rastreo de dispositivos móviles, "
        "aunque con limitaciones significativas de precisión y una tasa de captura que solo abarcaba a "
        "clientes con dispositivos encendidos y conectables, típicamente entre el 30% y 50% del total "
        "de visitantes (Mautz, 2012)."
    )

    add_parrafo(doc,
        "El avance más significativo se produjo con la maduración de los modelos de aprendizaje profundo "
        "para detección de objetos. La familia de modelos YOLO (You Only Look Once), introducida por "
        "Redmon et al. (2016) y sucesivamente mejorada hasta su versión 8 (Ultralytics, 2023), logró "
        "velocidades de inferencia compatibles con el procesamiento en tiempo real manteniendo alta "
        "precisión. Paralelamente, el desarrollo de algoritmos de seguimiento multi-objeto (Multi-Object "
        "Tracking, MOT) como SORT (Bewley et al., 2016), DeepSORT (Wojke et al., 2017) y ByteTrack "
        "(Zhang et al., 2022) permitió asignar identidades consistentes a cada persona detectada a lo "
        "largo de múltiples cuadros de video, posibilitando el análisis de trayectorias y tiempos de "
        "permanencia."
    )

    add_parrafo(doc,
        "En el ámbito comercial, empresas como RetailNext, Sensormatic Solutions (Johnson Controls) y "
        "V-Count ofrecen soluciones propietarias de analítica para retail basadas en visión por computadora. "
        "Sin embargo, estas soluciones presentan características que limitan su adopción: costos de "
        "licenciamiento elevados que oscilan entre 500 y 2.000 dólares mensuales por tienda, dependencia "
        "de hardware propietario, arquitecturas cerradas que dificultan la personalización, y procesamiento "
        "centralizado en la nube que implica el envío continuo de video a servidores externos con las "
        "consecuentes implicancias de privacidad y consumo de ancho de banda (Grand View Research, 2023)."
    )

    add_parrafo(doc,
        "El paradigma de edge computing, que propone realizar el procesamiento de datos en el punto de "
        "generación en lugar de transmitirlos a un centro de datos remoto, ha ganado relevancia como "
        "alternativa para aplicaciones de visión por computadora en tiempo real (Shi et al., 2016). Los "
        "avances en hardware de bajo consumo con capacidad de procesamiento de redes neuronales —como las "
        "plataformas NVIDIA Jetson, Intel NUC y mini PCs con GPUs integradas— han hecho viable la ejecución "
        "de modelos de detección de objetos directamente en el punto de captura de video."
    )

    add_parrafo(doc,
        "En Argentina, el mercado de retail analytics se encuentra en una etapa incipiente. Las grandes "
        "cadenas de supermercados (Coto, Jumbo, Disco, Carrefour) operan con sistemas de conteo básicos o "
        "carecen de ellos por completo, dependiendo exclusivamente de datos transaccionales para la toma "
        "de decisiones comerciales. Esta situación representa una oportunidad para la introducción de "
        "soluciones tecnológicas accesibles que permitan a estas organizaciones competir con mayor "
        "información y eficiencia."
    )

    # Descripción del área problemática
    add_subtitulo(doc, "Descripción del área problemática")

    add_parrafo(doc,
        "Las grandes superficies comerciales enfrentan un problema estructural de asimetría informativa: "
        "conocen con precisión lo que el cliente compró (a través del POS) pero desconocen casi por completo "
        "lo que sucede antes y durante el proceso de compra dentro del local. Esta falta de visibilidad "
        "afecta múltiples áreas operativas y estratégicas:"
    )

    add_parrafo(doc,
        "Los gerentes de tienda no disponen de información en tiempo real sobre la cantidad de personas "
        "dentro del local, lo que dificulta la gestión de la dotación de personal, la apertura de cajas "
        "y el cumplimiento de normativas de aforo.",
        bold_prefix="Gestión de tráfico y ocupación. "
    )

    add_parrafo(doc,
        "Las decisiones sobre la disposición de góndolas, la ubicación de productos y el diseño de "
        "recorridos se toman basándose en la intuición del gerente de categoría o en estudios de layout "
        "costosos y poco frecuentes, en lugar de en datos objetivos sobre el comportamiento real del "
        "consumidor.",
        bold_prefix="Distribución espacial y layout. "
    )

    add_parrafo(doc,
        "Las inversiones en exhibiciones especiales, islas promocionales y cabeceras de góndola carecen "
        "de una métrica confiable de impacto. No se mide cuántas personas se detuvieron frente a la "
        "promoción ni si eso se tradujo en un incremento real de ventas del producto promovido.",
        bold_prefix="Efectividad promocional. "
    )

    add_parrafo(doc,
        "La decisión de abrir o cerrar cajas se toma de forma reactiva cuando las filas ya son visiblemente "
        "largas, lo que genera tiempos de espera excesivos y potencial pérdida de clientes que abandonan "
        "el local sin comprar.",
        bold_prefix="Gestión de colas. "
    )

    add_parrafo(doc,
        "La detección de estantes vacíos depende de la revisión visual periódica del repositor, lo que "
        "genera ventanas de tiempo donde los productos están agotados sin que nadie lo registre, "
        "ocasionando ventas perdidas.",
        bold_prefix="Reposición de productos. "
    )

    add_parrafo(doc,
        "Si bien el concepto de tasa de conversión (visitantes que efectivamente compran) es un indicador "
        "fundamental en el comercio electrónico, las tiendas físicas rara vez lo calculan porque no miden "
        "con precisión la cantidad de visitantes.",
        bold_prefix="Tasa de conversión. "
    )

    add_parrafo(doc,
        "Estas problemáticas afectan de manera directa la rentabilidad del negocio. Estudios del sector "
        "estiman que las grandes superficies pierden entre un 3% y un 5% de sus ventas potenciales por "
        "problemas de stockout (Gruen et al., 2002), y que una reducción de un minuto en el tiempo "
        "promedio de espera en caja puede incrementar la satisfacción del cliente en un 15% y reducir "
        "la tasa de abandono en un 8% (Katz et al., 1991). La disponibilidad de datos sobre el "
        "comportamiento in-store permitiría abordar estas problemáticas de forma proactiva y basada en "
        "evidencia."
    )

    doc.add_page_break()

    # ============================================================
    # JUSTIFICACIÓN
    # ============================================================
    add_titulo(doc, "Justificación")

    add_parrafo(doc,
        "El desarrollo de RetailVision se justifica desde múltiples perspectivas que abarcan la necesidad "
        "del mercado, el impacto tecnológico, la relevancia empresarial y la innovación en tecnologías de "
        "la información y la comunicación."
    )

    add_parrafo(doc,
        "El proyecto responde a la necesidad concreta de las grandes superficies comerciales de contar con "
        "información objetiva y en tiempo real sobre el comportamiento del consumidor dentro de sus "
        "establecimientos. Los resultados del sistema permiten responder preguntas operativas inmediatas "
        "—como cuántas cajas abrir en un momento dado— y preguntas estratégicas de mediano plazo —como "
        "dónde ubicar una nueva categoría de productos para maximizar su visibilidad.",
        bold_prefix="Necesidades que satisface. "
    )

    add_parrafo(doc,
        "La plataforma integra y articula múltiples tecnologías de frontera en una solución cohesiva: "
        "modelos de aprendizaje profundo para detección y seguimiento de personas (YOLOv8, ByteTrack), "
        "procesamiento en el borde para garantizar privacidad y baja latencia, arquitectura multi-tenant "
        "para escalabilidad empresarial, y un motor de insights prescriptivos que no solo describe lo que "
        "ocurrió sino que recomienda acciones. Esta integración tecnológica constituye una contribución "
        "significativa al estado del arte en la aplicación de visión por computadora al dominio del retail.",
        bold_prefix="Impacto tecnológico. "
    )

    add_parrafo(doc,
        "Para las organizaciones del sector retail, el sistema ofrece beneficios tangibles y cuantificables: "
        "optimización de la dotación de personal basada en predicciones de tráfico, reducción de tiempos de "
        "espera en caja mediante alertas proactivas, incremento de la efectividad promocional a través de "
        "medición objetiva, reducción de ventas perdidas por stockout mediante monitoreo de estantes, y "
        "mejora continua del layout basada en datos reales de recorridos de clientes. El retorno de inversión "
        "se manifiesta tanto en reducción de costos operativos como en incremento de ventas.",
        bold_prefix="Relevancia empresarial. "
    )

    add_parrafo(doc,
        "La innovación central del proyecto radica en dos aspectos. Primero, la arquitectura de edge "
        "computing que permite procesar video localmente sin enviar imágenes a la nube, resolviendo "
        "simultáneamente los problemas de privacidad, latencia y ancho de banda que presentan las "
        "soluciones centralizadas existentes. Segundo, la traducción de métricas nativas del comercio "
        "electrónico al mundo físico: el dwell time equivale al tiempo en página, el ratio de "
        "pickup/putback equivale al carrito abandonado, y el recorrido por zonas equivale al embudo de "
        "navegación web. Esta analogía conceptual, implementada mediante visión por computadora, "
        "representa una innovación tanto a nivel de proceso como de tecnología.",
        bold_prefix="Innovación a nivel TIC y procesos. "
    )

    add_parrafo(doc,
        "El proyecto es técnicamente factible gracias a la disponibilidad de modelos de detección de objetos "
        "de código abierto con rendimiento suficiente para tiempo real (YOLOv8 ejecutando a más de 30 FPS en "
        "hardware de consumo), frameworks web maduros para el desarrollo del dashboard (Next.js, React), y "
        "servicios de backend gestionados que reducen la complejidad operativa (Supabase). Económicamente, "
        "el hardware requerido por tienda —un mini PC con GPU integrada y cámaras IP estándar— representa "
        "un costo significativamente inferior al de las soluciones propietarias del mercado.",
        bold_prefix="Factibilidad. "
    )

    doc.add_page_break()

    # ============================================================
    # OBJETIVO GENERAL
    # ============================================================
    add_titulo(doc, "Objetivo General")

    add_parrafo(doc,
        "Diseñar, desarrollar e implementar una plataforma de software de retail intelligence basada en "
        "visión por computadora y edge computing que permita a grandes superficies comerciales capturar, "
        "analizar y visualizar el comportamiento del consumidor dentro del establecimiento —incluyendo "
        "conteo de personas, mapas de calor, recorridos de clientes, análisis por zonas, efectividad de "
        "promociones y gestión de colas— proporcionando indicadores clave de rendimiento e insights "
        "prescriptivos para la toma de decisiones orientadas a incrementar las ventas y la eficiencia "
        "operativa."
    )

    # ============================================================
    # OBJETIVOS ESPECÍFICOS
    # ============================================================
    add_titulo(doc, "Objetivos Específicos")

    objetivos = [
        "Desarrollar un pipeline de visión por computadora capaz de detectar y rastrear personas en tiempo real utilizando el modelo YOLOv8 y el algoritmo de seguimiento ByteTrack, ejecutándose localmente en un dispositivo de borde (edge device).",
        "Implementar un sistema de conteo de personas basado en líneas virtuales configurables que permita medir entradas, salidas y ocupación actual del establecimiento con una precisión superior al 90%.",
        "Diseñar e implementar un módulo de generación de mapas de calor (heatmaps) que represente la distribución espacial del tráfico de clientes dentro de la tienda, segmentado por franjas horarias y días.",
        "Construir un sistema de definición y seguimiento de zonas que permita segmentar el local comercial en áreas lógicas (góndolas, cajas, entradas, zonas promocionales) y medir el tráfico, tiempo de permanencia (dwell time) y nivel de engagement en cada zona.",
        "Implementar un módulo de mapeo de recorridos (customer journey) que reconstruya la trayectoria completa de cada cliente a través de las zonas del local, identificando patrones de navegación dominantes y flujos entre zonas.",
        "Desarrollar un módulo de análisis de colas que detecte la cantidad de personas esperando en las zonas de caja, estime tiempos de espera y genere alertas automáticas cuando se superen umbrales configurables.",
        "Diseñar un módulo de medición de efectividad promocional que compare métricas de tráfico y engagement en zonas promocionales durante los períodos previo, activo y posterior a una campaña.",
        "Implementar un backend multi-tenant con base de datos relacional, seguridad a nivel de fila (Row Level Security) y API RESTful para la ingesta de datos desde los dispositivos de borde y la consulta desde el dashboard.",
        "Desarrollar un dashboard web responsivo que presente los indicadores clave mediante gráficos interactivos, mapas de calor visuales, diagramas de flujo de recorridos y tablas comparativas, adaptado a los roles de gerente de tienda, gerente de categoría y director comercial.",
        "Implementar un motor de insights y predicciones que genere recomendaciones accionables automáticas basadas en el análisis de tendencias, anomalías y correlaciones en los datos recopilados.",
        "Validar el sistema mediante la instalación en un local modelo, evaluando la precisión del conteo contra medición manual (ground truth), la latencia del sistema y la usabilidad del dashboard con usuarios representativos.",
    ]

    for i, obj in enumerate(objetivos, 1):
        add_numbered(doc, i, obj)

    doc.add_page_break()

    # ============================================================
    # MARCO TEÓRICO REFERENCIAL
    # ============================================================
    add_titulo(doc, "Marco Teórico Referencial")

    add_subtitulo(doc, "Visión por Computadora y Detección de Objetos")

    add_parrafo(doc,
        "La visión por computadora es una disciplina de la inteligencia artificial que busca dotar a las "
        "máquinas de la capacidad de interpretar y comprender información visual del mundo real. En el "
        "contexto de la detección de objetos, el objetivo es localizar e identificar objetos específicos "
        "dentro de una imagen o secuencia de video (Szeliski, 2022)."
    )

    add_parrafo(doc,
        "Los modelos de detección de objetos basados en redes neuronales convolucionales (CNN) han "
        "evolucionado significativamente en la última década. Los enfoques de dos etapas, como R-CNN y "
        "sus variantes (Girshick et al., 2014), alcanzan alta precisión pero con velocidades de inferencia "
        "incompatibles con el tiempo real. Los modelos de una etapa, como SSD (Liu et al., 2016) y la "
        "familia YOLO (Redmon et al., 2016), sacrifican una fracción de precisión a cambio de velocidades "
        "de procesamiento que permiten aplicaciones en tiempo real."
    )

    add_parrafo(doc,
        "YOLOv8, desarrollado por Ultralytics (2023), representa la iteración más reciente de la familia "
        "YOLO. Introduce mejoras en la arquitectura de red (backbone CSPDarknet con conexiones C2f), un "
        "head de detección desacoplado (decoupled head) y una función de pérdida basada en distribución "
        "(Distribution Focal Loss). El modelo ofrece variantes desde nano (3.2M parámetros, 8.7 GFLOPs) "
        "hasta extra-large (68.2M parámetros, 257.8 GFLOPs), permitiendo seleccionar el balance adecuado "
        "entre precisión y velocidad según el hardware disponible (Ultralytics, 2023). Para la detección "
        "de personas, que corresponde a la clase 0 del dataset COCO, YOLOv8n alcanza un mAP50 superior al "
        "80% con velocidades de más de 30 FPS en GPUs de consumo."
    )

    add_subtitulo(doc, "Seguimiento Multi-Objeto (Multi-Object Tracking)")

    add_parrafo(doc,
        "El seguimiento multi-objeto consiste en mantener la identidad de cada objeto detectado a lo largo "
        "de una secuencia de cuadros de video. Este problema presenta desafíos como las oclusiones parciales "
        "o totales, los cambios de apariencia, y la entrada y salida de objetos de la escena (Luo et al., 2021)."
    )

    add_parrafo(doc,
        "El paradigma dominante en MOT es tracking-by-detection, donde primero se ejecuta un detector de "
        "objetos en cada cuadro y luego se asocian las detecciones entre cuadros consecutivos. El algoritmo "
        "SORT (Simple Online and Realtime Tracking), propuesto por Bewley et al. (2016), utiliza el filtro "
        "de Kalman para predecir la posición futura de cada objeto y el algoritmo húngaro para la asociación "
        "óptima de detecciones. DeepSORT extiende este enfoque incorporando características de apariencia "
        "extraídas por una red neuronal para mejorar la asociación (Wojke et al., 2017)."
    )

    add_parrafo(doc,
        "ByteTrack, propuesto por Zhang et al. (2022), introduce una mejora significativa al considerar "
        "tanto las detecciones de alta confianza como las de baja confianza en el proceso de asociación. "
        "Las detecciones de alta confianza se asocian primero utilizando similitud de movimiento (IoU), y "
        "las detecciones de baja confianza se asocian en una segunda pasada con los tracks no emparejados. "
        "Este enfoque reduce significativamente la cantidad de identidades perdidas (ID switches) y mejora "
        "las métricas MOTA e IDF1, métricas estándar para evaluar el rendimiento de MOT (Zhang et al., 2022). "
        "ByteTrack se encuentra integrado nativamente en la librería Ultralytics, lo que facilita su uso "
        "conjunto con YOLOv8."
    )

    add_subtitulo(doc, "Edge Computing")

    add_parrafo(doc,
        "El edge computing es un paradigma de computación distribuida que acerca el procesamiento de datos "
        "al punto donde estos se generan, en contraposición al modelo tradicional de computación en la nube "
        "que centraliza el procesamiento en centros de datos remotos (Shi et al., 2016). En aplicaciones de "
        "visión por computadora, el edge computing ofrece ventajas fundamentales: reducción de latencia, al "
        "eliminar el tiempo de transmisión de video a un servidor remoto; preservación de la privacidad, al "
        "procesar las imágenes localmente y enviar únicamente métricas agregadas; reducción del consumo de "
        "ancho de banda, al evitar la transmisión continua de streams de video; y funcionamiento offline, al "
        "mantener la operación incluso ante pérdidas de conectividad (Satyanarayanan, 2017)."
    )

    add_parrafo(doc,
        "Plataformas de hardware como NVIDIA Jetson, Intel NUC y mini PCs con GPUs integradas han "
        "democratizado el acceso a capacidad de procesamiento de redes neuronales en dispositivos compactos "
        "y de bajo consumo energético, haciendo viable la ejecución de modelos como YOLOv8 en el punto de "
        "captura de video."
    )

    add_subtitulo(doc, "Retail Analytics")

    add_parrafo(doc,
        "El retail analytics abarca el conjunto de técnicas y herramientas utilizadas para analizar datos "
        "del comercio minorista con el objetivo de optimizar operaciones y maximizar ventas. Tradicionalmente, "
        "el análisis se ha centrado en datos transaccionales provenientes de sistemas POS, complementados con "
        "encuestas de satisfacción y estudios de mercado periódicos (Grewal et al., 2017)."
    )

    add_parrafo(doc,
        "La evolución hacia el in-store analytics busca capturar el comportamiento del consumidor antes y "
        "durante el proceso de compra. Las métricas clave incluyen: tasa de conversión (porcentaje de "
        "visitantes que realizan una compra), dwell time (tiempo de permanencia en una zona), engagement "
        "rate (nivel de interacción con un área o producto), customer journey (recorrido dentro del "
        "establecimiento) y revenue per visitor (ingreso promedio por visitante) (Shankar et al., 2021). "
        "Estas métricas, establecidas y ampliamente utilizadas en el comercio electrónico, tienen equivalentes "
        "directos en el retail físico cuando se dispone de la tecnología de captura adecuada."
    )

    add_subtitulo(doc, "Arquitectura de Software Multi-Tenant")

    add_parrafo(doc,
        "La arquitectura multi-tenant permite que múltiples organizaciones (tenants) compartan una misma "
        "instancia de la aplicación manteniendo sus datos completamente aislados. Este modelo es fundamental "
        "en aplicaciones SaaS (Software as a Service) donde se busca eficiencia operativa sin comprometer la "
        "seguridad ni la privacidad de cada organización (Bezemer & Zaidman, 2010). En el contexto de bases "
        "de datos relacionales, la seguridad a nivel de fila (Row Level Security, RLS) implementa el "
        "aislamiento de datos mediante políticas que filtran automáticamente las filas visibles para cada "
        "usuario en función de su organización. PostgreSQL ofrece soporte nativo para RLS, permitiendo "
        "definir políticas declarativas que se aplican de forma transparente a todas las consultas "
        "(PostgreSQL Global Development Group, 2024)."
    )

    add_subtitulo(doc, "Metodologías Ágiles: Scrum")

    add_parrafo(doc,
        "Scrum es un marco de trabajo ágil para el desarrollo de productos complejos, definido por Schwaber "
        "y Sutherland (2020) en la Guía de Scrum. Se estructura en ciclos iterativos denominados sprints, "
        "típicamente de dos a cuatro semanas de duración, al final de los cuales se produce un incremento de "
        "producto potencialmente entregable. Los roles principales en Scrum son: el Product Owner, responsable "
        "de maximizar el valor del producto y gestionar el backlog; el Scrum Master, encargado de facilitar el "
        "proceso y eliminar impedimentos; y el equipo de desarrollo, que ejecuta el trabajo técnico."
    )

    add_parrafo(doc,
        "Los artefactos incluyen el Product Backlog (lista priorizada de requerimientos), el Sprint Backlog "
        "(subconjunto seleccionado para el sprint actual) y el Incremento (resultado del sprint). Los eventos "
        "ceremoniales incluyen la planificación del sprint, el daily standup, la revisión del sprint y la "
        "retrospectiva (Schwaber & Sutherland, 2020). Para el presente proyecto, Scrum se adopta como marco "
        "metodológico dado que permite la entrega incremental de funcionalidades, facilita la adaptación a "
        "cambios de requerimientos durante el proceso, y promueve la validación temprana del producto con "
        "usuarios finales."
    )

    doc.add_page_break()

    # ============================================================
    # DISEÑO METODOLÓGICO
    # ============================================================
    add_titulo(doc, "Diseño Metodológico")

    add_subtitulo(doc, "Metodología de desarrollo")

    add_parrafo(doc,
        "El desarrollo del proyecto se estructura bajo el marco de trabajo Scrum, organizando el trabajo en "
        "sprints de dos semanas de duración. Cada sprint produce un incremento funcional del sistema que es "
        "evaluado y validado antes de avanzar al siguiente. El Product Backlog se organizó a partir de los "
        "módulos funcionales identificados en los objetivos específicos, priorizados según su valor para el "
        "negocio y sus dependencias técnicas."
    )

    add_parrafo(doc,
        "La planificación general del proyecto se divide en cuatro fases principales, alineadas con las "
        "cuatro entregas del Trabajo Final de Graduación:"
    )

    add_bullet(doc, "Fase 1 (Entregas 1-2): Fundación del sistema — arquitectura, modelos de datos, pipeline de visión base (detección, tracking, conteo, heatmap), dashboard base.", bold_prefix="")
    add_bullet(doc, "Fase 2 (Entregas 2-3): Módulos de análisis avanzado — zonas y dwell time, customer journey, queue analytics, efectividad de promos.", bold_prefix="")
    add_bullet(doc, "Fase 3 (Entregas 3-4): Inteligencia y prescripción — motor de insights, predicciones, correlaciones con factores externos, benchmarking.", bold_prefix="")
    add_bullet(doc, "Fase 4 (Entrega 4): Integración, piloto en local modelo, validación y documentación final.", bold_prefix="")

    add_subtitulo(doc, "Herramientas técnicas")

    add_parrafo(doc, "A continuación se detallan las herramientas técnicas seleccionadas para cada capa del sistema.", indent=True)

    add_parrafo(doc, "", bold_prefix="Pipeline de visión (Edge Device):", indent=False)
    add_table(doc,
        ["Componente", "Tecnología", "Función"],
        [
            ["Lenguaje", "Python 3.10+", "Runtime principal del edge device"],
            ["Detección", "YOLOv8 (Ultralytics)", "Detección de personas y objetos en tiempo real"],
            ["Tracking", "ByteTrack", "Asignación de IDs únicos entre frames"],
            ["Video", "OpenCV 4.x", "Captura y procesamiento de frames"],
            ["HTTP", "httpx", "Envío asíncrono de datos al backend"],
            ["Buffer offline", "SQLite3", "Almacenamiento local ante pérdida de conexión"],
            ["Streaming", "WebSockets", "Transmisión de video para calibración remota"],
            ["Monitoreo", "psutil", "Métricas de salud del dispositivo (CPU, memoria)"],
        ]
    )

    add_parrafo(doc, "", bold_prefix="Backend:", indent=False)
    add_table(doc,
        ["Componente", "Tecnología", "Función"],
        [
            ["Framework", "Next.js 14", "App Router, API Routes, Server-Side Rendering"],
            ["Base de datos", "Supabase (PostgreSQL)", "Almacenamiento con Auth, RLS y Realtime"],
            ["Validación", "Zod", "Validación de esquemas de datos de entrada"],
            ["Deploy", "Vercel", "Hosting y funciones serverless"],
        ]
    )

    add_parrafo(doc, "", bold_prefix="Frontend (Dashboard):", indent=False)
    add_table(doc,
        ["Componente", "Tecnología", "Función"],
        [
            ["UI", "React 18", "Componentes funcionales con hooks"],
            ["Estilos", "Tailwind CSS 3.4", "Framework CSS utility-first"],
            ["Componentes", "Shadcn/ui (Radix UI)", "Librería de componentes accesibles"],
            ["Gráficos", "Recharts", "Visualización de datos (área, barra, línea)"],
            ["Estado global", "Zustand", "Gestión de estado liviana"],
            ["Data fetching", "TanStack React Query", "Consulta y caché de datos del servidor"],
            ["Fechas", "date-fns", "Manipulación y formateo de fechas"],
        ]
    )

    add_subtitulo(doc, "Técnicas de recopilación de datos")

    add_parrafo(doc,
        "Para el relevamiento de requerimientos y la validación del sistema se utilizan las siguientes técnicas:"
    )

    add_parrafo(doc,
        "Visitas a establecimientos de grandes superficies para documentar la operatoria actual, los "
        "procesos de gestión de tráfico, reposición y colas, y las carencias informativas que los gerentes "
        "enfrentan en su operación diaria.",
        bold_prefix="Observación de campo. "
    )

    add_parrafo(doc,
        "Conversaciones guiadas con perfiles relevantes del sector retail (gerentes de tienda, jefes de "
        "sección, repositores, cajeros) para comprender los procesos de toma de decisión actuales y las "
        "necesidades de información insatisfechas.",
        bold_prefix="Entrevistas semi-estructuradas. "
    )

    add_parrafo(doc,
        "Revisión de reportes de la industria del retail analytics, papers académicos sobre detección y "
        "seguimiento de personas, y documentación técnica de las herramientas utilizadas.",
        bold_prefix="Análisis documental. "
    )

    add_parrafo(doc,
        "Análisis comparativo de soluciones existentes en el mercado (RetailNext, V-Count, Sensormatic) "
        "para identificar funcionalidades estándar, diferenciales y oportunidades de mejora.",
        bold_prefix="Benchmarking. "
    )

    add_subtitulo(doc, "Diagrama de Gantt")

    add_parrafo(doc,
        "La siguiente tabla presenta la planificación temporal de las actividades distribuidas en los 6 "
        "meses del proyecto, alineadas con las 4 entregas del TFG."
    )

    add_table(doc,
        ["Actividad", "Mes 1", "Mes 2", "Mes 3", "Mes 4", "Mes 5", "Mes 6"],
        [
            ["Relevamiento y documentación", "████", "", "", "", "", ""],
            ["Diseño de arquitectura y modelo de datos", "██", "██", "", "", "", ""],
            ["Pipeline de visión (detección, tracking, conteo)", "", "████", "██", "", "", ""],
            ["Backend: DB, API de ingesta, Auth", "", "████", "", "", "", ""],
            ["Dashboard base: layout, overview, tráfico", "", "██", "████", "", "", ""],
            ["Zonas, dwell time, zone editor", "", "", "████", "██", "", ""],
            ["Customer journey + diagramas de flujo", "", "", "██", "████", "", ""],
            ["Queue analytics + alertas", "", "", "", "████", "██", ""],
            ["Efectividad de promos", "", "", "", "██", "██", ""],
            ["Motor de insights y predicciones", "", "", "", "██", "████", ""],
            ["Correlaciones con factores externos", "", "", "", "", "████", ""],
            ["Benchmarking multi-sucursal", "", "", "", "", "██", "██"],
            ["Piloto en local modelo", "", "", "", "", "██", "████"],
            ["Validación y documentación final", "", "", "", "", "", "████"],
            ["", "", "", "", "", "", ""],
            ["ENTREGA 1", "▲", "", "", "", "", ""],
            ["ENTREGA 2", "", "", "▲", "", "", ""],
            ["ENTREGA 3", "", "", "", "", "▲", ""],
            ["ENTREGA 4", "", "", "", "", "", "▲"],
        ]
    )

    doc.add_page_break()

    # ============================================================
    # RELEVAMIENTO
    # ============================================================
    add_titulo(doc, "Relevamiento")

    add_subtitulo(doc, "Relevamiento Estructural")

    add_parrafo(doc,
        "El presente proyecto se desarrolla como una solución genérica aplicable a organizaciones del tipo "
        "gran superficie comercial (supermercados, hipermercados, tiendas departamentales). Para el "
        "relevamiento se toma como modelo una organización tipo con las siguientes características:"
    )

    add_parrafo(doc, "Cadena de supermercados con múltiples sucursales.", bold_prefix="Tipo de organización: ")

    add_parrafo(doc,
        "Cada sucursal opera en un local de entre 2.000 y 10.000 metros cuadrados, con áreas diferenciadas: "
        "acceso principal, zona de cajas, pasillos con góndolas organizadas por categoría (almacén, bebidas, "
        "lácteos, frescos, limpieza, perfumería, electrónica), zonas de productos frescos (carnicería, "
        "panadería, verdulería), islas promocionales, y depósito trasero.",
        bold_prefix="Estructura física: "
    )

    add_parrafo(doc,
        "La organización modelo cuenta con entre 5 y 50 sucursales distribuidas geográficamente, cada una "
        "con su propia dotación de personal y autonomía operativa parcial, pero con dirección comercial y "
        "estratégica centralizada.",
        bold_prefix="Sucursales: "
    )

    add_parrafo(doc, "La infraestructura tecnológica existente en la organización modelo incluye:", bold_prefix="Infraestructura tecnológica existente:", indent=True)
    add_bullet(doc, "Sistema de punto de venta (POS) que registra transacciones, productos vendidos y montos.")
    add_bullet(doc, "Sistema de gestión de inventario (ERP) para control de stock y reposición.")
    add_bullet(doc, "Red de cámaras de seguridad (CCTV) con entre 8 y 30 cámaras por sucursal, conectadas a un DVR/NVR local.")
    add_bullet(doc, "Conectividad a internet en cada sucursal (fibra óptica o enlace dedicado).")
    add_bullet(doc, "Red local (LAN) cableada y Wi-Fi.")

    add_parrafo(doc,
        "El sistema RetailVision se instala como una capa adicional sobre la infraestructura existente. "
        "Utiliza las cámaras de seguridad ya instaladas (o agrega cámaras IP dedicadas donde se requiera "
        "mayor resolución), conectándolas a un edge device (mini PC) que se instala en el rack de "
        "comunicaciones de la sucursal. Este dispositivo se conecta a la red local existente y requiere "
        "acceso a internet para comunicarse con el backend en la nube. No interfiere con los sistemas "
        "existentes (POS, ERP, CCTV) y puede integrarse con el POS para cruzar datos de tráfico con "
        "datos transaccionales.",
        bold_prefix="Relevancia para el proyecto: "
    )

    add_parrafo(doc,
        "Se dispondrá de un local comercial donde se instalará el sistema completo para validación. "
        "Este local contará con al menos 2 cámaras conectadas al edge device, cubriendo la entrada "
        "principal y una sección de góndolas, lo que permitirá validar los módulos de conteo, heatmap, "
        "zonas, dwell time y recorridos.",
        bold_prefix="Local modelo para validación: "
    )

    add_subtitulo(doc, "Relevamiento Funcional")

    add_parrafo(doc,
        "A continuación se presenta la estructura jerárquica de la organización modelo y las funciones de "
        "los roles involucrados en el proyecto."
    )

    add_parrafo(doc, "", bold_prefix="Organigrama:", indent=False)

    add_parrafo(doc,
        "La organización modelo presenta una estructura jerárquica compuesta por los siguientes niveles: "
        "Director General en la cúspide; tres direcciones funcionales (Director Comercial, Director de "
        "Operaciones, Director de Tecnología); nivel de gerencias (Gerente de Categoría dependiente del "
        "Director Comercial, Gerente de Tienda dependiente del Director de Operaciones, Equipo de Sistemas "
        "dependiente del Director de Tecnología); nivel de jefaturas dentro de cada tienda (Jefe de Sección, "
        "Jefe de Cajas, Jefe de Depósito); y nivel operativo (repositores, vendedores, cajeros)."
    )

    add_parrafo(doc, "", bold_prefix="Roles y funciones involucrados en el proyecto:", indent=False)

    add_parrafo(doc,
        "Responsable de la estrategia comercial de toda la cadena. Define políticas de pricing, "
        "promociones, layout de referencia y mix de categorías. En el contexto de RetailVision, es el "
        "usuario del módulo de benchmarking multi-sucursal y de las predicciones estratégicas.",
        bold_prefix="Director Comercial. "
    )

    add_parrafo(doc,
        "Responsable del rendimiento comercial de una o más categorías de producto en todas las "
        "sucursales. Decide la ubicación de productos en góndola, diseña las promociones y evalúa su "
        "efectividad. En el contexto de RetailVision, es el usuario principal de los módulos de "
        "efectividad promocional, análisis por zona, dwell time y recorridos de clientes.",
        bold_prefix="Gerente de Categoría. "
    )

    add_parrafo(doc,
        "Responsable de la operación diaria de una sucursal. Gestiona la dotación de personal, la "
        "apertura de cajas, la reposición de productos y la atención al cliente. En el contexto de "
        "RetailVision, es el usuario principal de los módulos de ocupación en tiempo real, gestión de "
        "colas, alertas de estantes vacíos y predicciones de tráfico para la planificación de turnos.",
        bold_prefix="Gerente de Tienda. "
    )

    add_parrafo(doc,
        "Responsable de un área específica dentro de la sucursal. Supervisa la reposición, la "
        "presentación de productos y la atención al cliente en su sección. Consume información de "
        "tráfico y engagement específica de su sección.",
        bold_prefix="Jefe de Sección. "
    )

    add_parrafo(doc,
        "Responsable de coordinar la apertura y cierre de cajas y gestionar la dotación de cajeros. "
        "Es el usuario principal del módulo de gestión de colas y alertas de tiempos de espera.",
        bold_prefix="Jefe de Cajas. "
    )

    add_parrafo(doc,
        "Responsable de la infraestructura informática, redes y sistemas. En el contexto de RetailVision, "
        "es responsable de la instalación del edge device, la configuración de las cámaras, la conectividad "
        "y el mantenimiento técnico del sistema.",
        bold_prefix="Equipo de Sistemas. "
    )

    add_parrafo(doc, "", bold_prefix="Procesos funcionales relevados:", indent=False)

    add_proceso(doc,
        "Monitoreo de ocupación del local",
        "Gerente de Tienda, Personal de seguridad",
        [
            "El personal de seguridad o el gerente realizan estimaciones visuales del nivel de ocupación del local.",
            "En caso de percibir alta ocupación, se comunica verbalmente al equipo para estar atentos.",
            "No existe registro histórico ni medición objetiva del tráfico.",
        ],
        "La estimación es subjetiva, no se registra, y no permite planificación."
    )

    add_proceso(doc,
        "Gestión de líneas de cajas",
        "Jefe de Cajas, Gerente de Tienda, Cajeros",
        [
            "El jefe de cajas observa la longitud de las filas de forma visual.",
            "Cuando las filas se perciben largas, solicita la apertura de cajas adicionales.",
            "La decisión se toma de forma reactiva, cuando el problema ya es visible.",
            "Al disminuir el flujo, se cierran cajas según la percepción del jefe de cajas.",
        ],
        "Decisión reactiva que genera tiempos de espera excesivos antes de la intervención."
    )

    add_proceso(doc,
        "Reposición y control de estantes",
        "Jefe de Sección, Repositores, Jefe de Depósito",
        [
            "Los repositores recorren las góndolas de su sección de forma periódica (cada 1-2 horas).",
            "Identifican visualmente los huecos en los estantes.",
            "Consultan el stock disponible en depósito (sistema ERP o revisión física).",
            "Reponen los productos faltantes.",
            "Si no hay stock en depósito, informan al jefe de sección.",
        ],
        "El tiempo entre que un producto se agota y se detecta el vacío puede ser de varias horas, generando ventas perdidas."
    )

    add_proceso(doc,
        "Medición de impacto de promociones",
        "Gerente de Categoría, Gerente de Tienda",
        [
            "El gerente de categoría diseña una promoción y define su ubicación en la tienda.",
            "Se implementa la exhibición promocional (isla, cabecera de góndola, etc.).",
            "Al finalizar el período promocional, se analizan las ventas del producto promovido comparando con el período anterior.",
            "No se mide el tráfico en la zona de la promoción ni la cantidad de personas que interactuaron con ella.",
        ],
        "La medición se limita a ventas, sin visibilidad sobre cuántas personas vieron la promoción pero no compraron."
    )

    add_proceso(doc,
        "Asignación de turnos y personal",
        "Gerente de Tienda, Jefes de Sección",
        [
            "El gerente de tienda define los turnos basándose en la experiencia y patrones históricos informales.",
            "Se asigna más personal los días que se perciben como de mayor afluencia (fines de semana, feriados).",
            "No se utiliza data cuantitativa para la planificación.",
        ],
        "La dotación puede resultar excesiva en horarios de baja afluencia o insuficiente en picos no anticipados."
    )

    add_proceso(doc,
        "Evaluación y modificación del layout de la tienda",
        "Director Comercial, Gerente de Categoría, Gerente de Tienda",
        [
            "El director comercial establece lineamientos generales de layout para la cadena.",
            "El gerente de categoría propone cambios de ubicación de productos o secciones.",
            "Se implementa el cambio y se evalúan las ventas semanas después.",
            "No se mide el impacto del cambio en el recorrido de los clientes ni en el tráfico por zona.",
        ],
        "Sin datos de recorridos, no se puede medir objetivamente si un cambio de layout mejoró o empeoró la navegación."
    )

    add_subtitulo(doc, "Relevamiento de documentación")

    add_parrafo(doc,
        "Los documentos que intervienen en los procesos relevados se mencionan a continuación. El detalle "
        "completo de cada documento, incluyendo los campos de datos que contienen, se incluye en el Anexo A "
        "al final del presente documento."
    )

    add_numbered(doc, 1, "Reporte de ventas diario (POS): generado automáticamente por el sistema de punto de venta. Contiene fecha, sucursal, total de transacciones, monto total, desglose por categoría y ticket promedio.")
    add_numbered(doc, 2, "Planilla de turnos: documento donde el gerente de tienda asigna los turnos del personal. Contiene fecha, empleado, rol, horarios y sector asignado.")
    add_numbered(doc, 3, "Orden de reposición: documento generado cuando se detecta faltante en góndola. Contiene producto, código SKU, cantidad faltante, ubicación y prioridad.")
    add_numbered(doc, 4, "Brief de promoción: documento que describe una campaña promocional. Contiene nombre, producto, tipo de exhibición, fechas, ubicación y objetivo de ventas.")
    add_numbered(doc, 5, "Reporte de evaluación promocional: documento posterior a una campaña. Contiene ventas durante y antes de la campaña, variación porcentual y ROI estimado.")
    add_numbered(doc, 6, "Informe de incidencias de caja: registro de eventos en la línea de cajas. Contiene cajas abiertas, longitud máxima de cola y acciones tomadas.")

    doc.add_page_break()

    # ============================================================
    # PROCESO DE NEGOCIO
    # ============================================================
    add_titulo(doc, "Proceso de Negocio")

    add_parrafo(doc,
        "A continuación se presenta el proceso genérico integrado denominado «Análisis de Comportamiento "
        "del Consumidor y Optimización Operativa en Gran Superficie», que articula todos los procesos "
        "funcionales relevados en un flujo unificado. El proceso opera de manera continua durante el "
        "horario comercial del establecimiento."
    )

    pasos_bpm = [
        ("1. Instalación y Configuración", "Equipo de Sistemas",
         "Instalar edge device y cámaras. Configurar conexión al backend. Definir zonas en el editor visual. Calibrar líneas de conteo. Configurar reglas de alertas. Este paso se ejecuta una única vez por sucursal y se repite solo ante cambios de layout o equipamiento."),

        ("2. Captura y Procesamiento (Edge)", "Sistema automático",
         "Capturar frames de video en tiempo real. Detectar personas mediante YOLOv8. Rastrear personas con ByteTrack asignando IDs únicos. Contar entradas y salidas por línea virtual. Acumular datos de heatmap. Registrar presencia en zonas y calcular dwell time. Mapear recorridos completos (customer journeys). Detectar colas en zonas de caja."),

        ("3. Ingesta de Datos al Backend", "Sistema automático",
         "Enviar conteos agregados cada 5 minutos. Enviar heatmaps normalizados cada hora. Enviar datos de tráfico por zona cada 5 minutos. Enviar journeys completados al finalizar cada tracking. Enviar snapshots de colas periódicamente. Enviar heartbeat del device cada 60 segundos. En caso de pérdida de conexión, almacenar en buffer local (SQLite) y reenviar al reconectar."),

        ("4. Análisis y Generación de Insights", "Sistema automático",
         "Calcular resúmenes diarios por tienda y por zona. Generar rankings de zonas por tráfico, dwell time y engagement. Detectar tendencias (comparación semanal) y anomalías. Cruzar datos de tráfico con datos de POS para calcular tasas de conversión. Correlacionar con factores externos (clima, feriados, días de cobro). Generar predicciones de tráfico por hora y por día. Evaluar efectividad de campañas promocionales activas. Producir insights prescriptivos con recomendaciones accionables."),

        ("5. Visualización y Alertas", "Dashboard (sistema automático)",
         "Actualizar el dashboard en tiempo real mediante polling cada 60 segundos. Presentar KPIs segmentados por rol (gerente de tienda, gerente de categoría, director comercial). Disparar alertas configuradas: cola superior al umbral, estante vacío detectado, dispositivo offline, aforo excedido. Notificar al rol correspondiente según la naturaleza de la alerta."),

        ("6. Toma de Decisión", "Gerente (según tipo de decisión)",
         "El gerente correspondiente evalúa la información presentada en el dashboard y las alertas recibidas. Decisiones operativas (gerente de tienda): abrir cajas adicionales, reasignar personal a zonas con alta demanda, solicitar reposición urgente. Decisiones comerciales (gerente de categoría): ajustar exhibición promocional, modificar ubicación de productos, replicar prácticas de sucursales con mejor rendimiento. Decisiones estratégicas (director comercial): modificar layout de referencia, ajustar política de dotación, definir inversión en promociones."),

        ("7. Ejecución de la Acción", "Personal operativo",
         "Cajeros abren o cierran cajas según la indicación. Repositores reponen los productos señalados. Vendedores se reubican en las zonas indicadas. El equipo de merchandising implementa cambios de layout o exhibición. Se registra la acción ejecutada en el sistema para su posterior evaluación."),

        ("8. Medición de Impacto", "Sistema automático + Gerente",
         "El sistema mide automáticamente las métricas post-acción en las zonas afectadas. Compara los indicadores antes y después de la intervención. Genera un insight sobre la efectividad de la acción tomada. Alimenta el modelo predictivo con el resultado para mejorar futuras recomendaciones. El ciclo se repite continuamente, volviendo al paso 2."),
    ]

    for titulo_paso, rol, descripcion in pasos_bpm:
        add_parrafo(doc, "", bold_prefix=titulo_paso, indent=False)
        add_parrafo(doc, rol, bold_prefix="Rol: ", indent=False)
        add_parrafo(doc, descripcion)

    add_parrafo(doc,
        "Este proceso integra los seis procesos funcionales relevados de la siguiente manera: la gestión "
        "de tráfico y ocupación se aborda en los pasos 2, 3 y 5; la apertura y cierre de cajas se aborda "
        "en los pasos 5, 6 y 7; la reposición de productos se aborda en los pasos 5, 6 y 7; la evaluación "
        "de efectividad promocional se aborda en los pasos 4 y 8; la planificación de dotación de personal "
        "se aborda en los pasos 4 y 6; y el análisis de layout y distribución se aborda en los pasos 4, 6 y 8."
    )

    doc.add_page_break()

    # ============================================================
    # REFERENCIAS
    # ============================================================
    add_titulo(doc, "Referencias")

    referencias = [
        "Bewley, A., Ge, Z., Ott, L., Ramos, F., & Upcroft, B. (2016). Simple online and realtime tracking. Proceedings of the IEEE International Conference on Image Processing (ICIP), 3464-3468. https://doi.org/10.1109/ICIP.2016.7533003",
        "Bezemer, C. P., & Zaidman, A. (2010). Multi-tenant SaaS applications: Maintenance dream or nightmare? Proceedings of the Joint ERCIM Workshop on Software Evolution and International Workshop on Principles of Software Evolution, 88-92. https://doi.org/10.1145/1862372.1862393",
        "Girshick, R., Donahue, J., Darrell, T., & Malik, J. (2014). Rich feature hierarchies for accurate object detection and semantic segmentation. Proceedings of the IEEE Conference on Computer Vision and Pattern Recognition (CVPR), 580-587. https://doi.org/10.1109/CVPR.2014.81",
        "Grand View Research. (2023). Retail analytics market size, share & trends analysis report. Grand View Research, Inc.",
        "Grewal, D., Roggeveen, A. L., & Nordfält, J. (2017). The future of retailing. Journal of Retailing, 93(1), 1-6. https://doi.org/10.1016/j.jretai.2016.12.008",
        "Gruen, T. W., Corsten, D. S., & Bharadwaj, S. (2002). Retail out-of-stocks: A worldwide examination of extent, causes and consumer responses. Grocery Manufacturers of America.",
        "Katz, K. L., Larson, B. M., & Larson, R. C. (1991). Prescription for the waiting-in-line blues: Entertain, enlighten, and engage. MIT Sloan Management Review, 32(2), 44-53.",
        "Liu, W., Anguelov, D., Erhan, D., Szegedy, C., Reed, S., Fu, C. Y., & Berg, A. C. (2016). SSD: Single shot multibox detector. Proceedings of the European Conference on Computer Vision (ECCV), 21-37. https://doi.org/10.1007/978-3-319-46448-0_2",
        "Luo, W., Xing, J., Milan, A., Zhang, X., Liu, W., & Kim, T. K. (2021). Multiple object tracking: A literature review. Artificial Intelligence, 293, 103448. https://doi.org/10.1016/j.artint.2020.103448",
        "Mautz, R. (2012). Indoor positioning technologies [Doctoral dissertation, ETH Zurich]. ETH Zurich Research Collection. https://doi.org/10.3929/ethz-a-007313554",
        "PostgreSQL Global Development Group. (2024). PostgreSQL 16 documentation: Row security policies. https://www.postgresql.org/docs/16/ddl-rowsecurity.html",
        "Redmon, J., Divvala, S., Girshick, R., & Farhadi, A. (2016). You only look once: Unified, real-time object detection. Proceedings of the IEEE Conference on Computer Vision and Pattern Recognition (CVPR), 779-788. https://doi.org/10.1109/CVPR.2016.91",
        "Satyanarayanan, M. (2017). The emergence of edge computing. Computer, 50(1), 30-39. https://doi.org/10.1109/MC.2017.9",
        "Schwaber, K., & Sutherland, J. (2020). The Scrum Guide: The definitive guide to Scrum: The rules of the game. Scrum.org.",
        "Shankar, V., Kalyanam, K., Setia, P., Golber, A., Mehta, S., Aella, J., & Vandenbosch, M. (2021). How technology is changing retail. Journal of Retailing, 97(1), 13-27. https://doi.org/10.1016/j.jretai.2020.10.006",
        "Shi, W., Cao, J., Zhang, Q., Li, Y., & Xu, L. (2016). Edge computing: Vision and challenges. IEEE Internet of Things Journal, 3(5), 637-646. https://doi.org/10.1109/JIOT.2016.2579198",
        "Szeliski, R. (2022). Computer vision: Algorithms and applications (2nd ed.). Springer. https://doi.org/10.1007/978-3-030-34372-9",
        "Ultralytics. (2023). YOLOv8 documentation. Ultralytics. https://docs.ultralytics.com/",
        "Verhoef, P. C., Kannan, P. K., & Inman, J. J. (2015). From multi-channel retailing to omni-channel retailing. Journal of Retailing, 91(2), 174-181. https://doi.org/10.1016/j.jretai.2015.02.005",
        "Wojke, N., Bewley, A., & Paulus, D. (2017). Simple online and realtime tracking with a deep association metric. Proceedings of the IEEE International Conference on Image Processing (ICIP), 3645-3649. https://doi.org/10.1109/ICIP.2017.8296962",
        "Zhang, Y., Sun, P., Jiang, Y., Yu, D., Weng, F., Yuan, Z., Luo, P., Liu, W., & Wang, X. (2022). ByteTrack: Multi-object tracking by associating every detection box. Proceedings of the European Conference on Computer Vision (ECCV), 1-21. https://doi.org/10.1007/978-3-031-20047-2_1",
    ]

    for ref in referencias:
        p = doc.add_paragraph()
        p.alignment = WD_ALIGN_PARAGRAPH.JUSTIFY
        p.paragraph_format.left_indent = Cm(1.27)
        p.paragraph_format.first_line_indent = Cm(-1.27)
        run = p.add_run(ref)
        run.font.name = "Times New Roman"
        run.font.size = Pt(11)
        run._element.rPr.rFonts.set(qn("w:eastAsia"), "Times New Roman")
        set_line_spacing(p)
        p.paragraph_format.space_after = Pt(6)

    doc.add_page_break()

    # ============================================================
    # ANEXO A
    # ============================================================
    add_titulo(doc, "Anexo A: Documentación Relevada")

    docs_data = [
        ("A.1 Reporte de Ventas Diario (POS)", [
            ["Fecha", "Fecha", "Fecha del reporte"],
            ["Sucursal", "Texto", "Nombre/código de la sucursal"],
            ["Total transacciones", "Entero", "Cantidad de tickets emitidos"],
            ["Monto total", "Decimal", "Suma total de ventas en pesos"],
            ["Ticket promedio", "Decimal", "Monto total / Total transacciones"],
            ["Desglose por categoría", "Tabla", "Categoría, cantidad, subtotal"],
            ["Formas de pago", "Tabla", "Efectivo, débito, crédito: monto y %"],
            ["Horario pico", "Hora", "Franja con mayor cantidad de transacciones"],
        ]),
        ("A.2 Planilla de Turnos", [
            ["Fecha", "Fecha", "Fecha del turno"],
            ["Empleado", "Texto", "Nombre del empleado"],
            ["Legajo", "Texto", "Número de legajo"],
            ["Rol", "Texto", "Cajero, repositor, vendedor, jefe, etc."],
            ["Sector asignado", "Texto", "Sección o área de trabajo"],
            ["Hora entrada", "Hora", "Inicio del turno"],
            ["Hora salida", "Hora", "Fin del turno"],
            ["Observaciones", "Texto", "Notas adicionales"],
        ]),
        ("A.3 Orden de Reposición", [
            ["Fecha/hora", "Fecha y hora", "Momento de detección del faltante"],
            ["Producto", "Texto", "Nombre del producto"],
            ["Código SKU", "Texto", "Código interno del producto"],
            ["Categoría", "Texto", "Categoría del producto"],
            ["Ubicación góndola", "Texto", "Pasillo, estante, posición"],
            ["Cantidad faltante", "Entero", "Unidades faltantes estimadas"],
            ["Stock en depósito", "Entero", "Unidades disponibles"],
            ["Prioridad", "Texto", "Alta, media, baja"],
            ["Estado", "Texto", "Pendiente, en proceso, completado"],
            ["Repositor asignado", "Texto", "Nombre del repositor"],
            ["Hora de reposición", "Hora", "Momento de completado"],
        ]),
        ("A.4 Brief de Promoción", [
            ["Nombre de campaña", "Texto", "Identificador de la promoción"],
            ["Producto/categoría", "Texto", "Producto o categoría promovida"],
            ["Tipo de exhibición", "Texto", "Isla, cabecera, banner, etc."],
            ["Ubicación en tienda", "Texto", "Zona/pasillo de instalación"],
            ["Fecha inicio", "Fecha", "Inicio de la campaña"],
            ["Fecha fin", "Fecha", "Fin de la campaña"],
            ["Descuento/oferta", "Texto", "Descripción (2x1, 30% off, etc.)"],
            ["Costo de exhibición", "Decimal", "Costo de instalación y materiales"],
            ["Objetivo de ventas", "Decimal", "Meta de ventas esperada"],
            ["Responsable", "Texto", "Gerente de categoría asignado"],
        ]),
        ("A.5 Reporte de Evaluación Promocional", [
            ["Nombre de campaña", "Texto", "Identificador de la promoción"],
            ["Ventas durante campaña", "Decimal", "Monto vendido del producto"],
            ["Ventas período anterior", "Decimal", "Monto en período equivalente previo"],
            ["Variación porcentual", "Porcentaje", "Incremento o decremento"],
            ["Unidades vendidas", "Entero", "Cantidad de unidades"],
            ["ROI estimado", "Porcentaje", "(Incremento - costo) / costo × 100"],
            ["Tráfico en zona promo", "Entero", "Personas en la zona (si disponible)"],
            ["Interacciones", "Entero", "Personas que se detuvieron"],
            ["Observaciones", "Texto", "Comentarios del gerente"],
        ]),
        ("A.6 Informe de Incidencias de Caja", [
            ["Fecha", "Fecha", "Fecha del informe"],
            ["Franja horaria", "Hora", "Período analizado"],
            ["Cajas habilitadas", "Entero", "Total de cajas disponibles"],
            ["Cajas abiertas (prom.)", "Entero", "Cajas operativas en promedio"],
            ["Cola máxima", "Entero", "Mayor longitud de fila registrada"],
            ["Tiempo espera est.", "Minutos", "Tiempo promedio estimado"],
            ["Incidencias", "Texto", "Descripción de eventos relevantes"],
            ["Acciones tomadas", "Texto", "Medidas correctivas aplicadas"],
        ]),
    ]

    for titulo_anexo, filas in docs_data:
        add_subtitulo(doc, titulo_anexo)
        add_table(doc, ["Campo", "Tipo", "Descripción"], filas)

    # ============================================================
    # GUARDAR
    # ============================================================
    output_path = r"c:\Users\luki_\Downloads\retailvision\Entrega_1_TFG_RetailVision.docx"
    doc.save(output_path)
    print(f"Documento generado: {output_path}")
    return output_path


if __name__ == "__main__":
    build_document()
