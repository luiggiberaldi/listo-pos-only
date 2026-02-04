# Ollama Setup Guide - Listo Ghost Edge Consciousness

## ¿Qué es Ollama?

Ollama es un runtime local para modelos de lenguaje (LLMs) que te permite ejecutar inteligencia artificial directamente en tu computadora, sin depender de servicios cloud externos.

**Beneficios para Listo Ghost:**
- ✅ **Costo $0** - Sin límites de API ni cuotas mensuales
- ✅ **Latencia Ultra-Baja** - Respuestas en 50-200ms vs 500-2000ms cloud
- ✅ **Privacidad Total** - Tus consultas nunca salen de tu máquina
- ✅ **Disponibilidad Offline** - Funciona sin conexión a internet

---

## Instalación (Windows)

### 1. Descargar Ollama

Visita: **https://ollama.ai/download**

Descarga el instalador para Windows y ejecútalo. El proceso es automático.

### 2. Verificar Instalación

Abre **PowerShell** o **CMD** y ejecuta:

```bash
ollama --version
```

Deberías ver algo como: `ollama version 0.1.x`

### 3. Descargar el Modelo Recomendado

Ejecuta el siguiente comando para descargar **Llama 3.1 8B** (4.7GB):

```bash
ollama pull llama3.1:8b
```

**Tiempo estimado:** 5-15 minutos dependiendo de tu conexión.

**Alternativa ligera** (si tienes hardware limitado):
```bash
ollama pull phi3:mini
```
(Solo 2GB, pero menos preciso)

### 4. Verificar que el Modelo Está Listo

```bash
ollama list
```

Deberías ver `llama3.1:8b` en la lista.

### 5. Probar el Modelo (Opcional)

```bash
ollama run llama3.1:8b
```

Escribe cualquier pregunta y presiona Enter. Para salir, escribe `/bye`.

---

## Configuración en Listo POS

### Variables de Entorno

Abre tu archivo `.env` y agrega (o verifica que existan):

```env
# Ollama Local LLM (Opcional - Prioridad Máxima)
VITE_OLLAMA_ENDPOINT=http://localhost:11434
VITE_OLLAMA_MODEL=llama3.1:8b
```

### Reiniciar la Aplicación

1. Detén el servidor de desarrollo (`Ctrl+C`)
2. Ejecuta `npm run dev` nuevamente
3. Abre la aplicación en el navegador

### Verificar que Ollama Está Activo

En el chat de **Listo Ghost**, observa el LED de estado:

- 🟡 **Dorado/Amarillo**: Ollama Local activo (Poder Ilimitado)
- 🔵 **Cyan**: Local Reasoner (Determinístico)
- 🟣 **Violeta**: Gemini Cloud (Fallback)

---

## Troubleshooting

### ❌ "Ollama no se detecta"

**Causa:** El servicio de Ollama no está corriendo.

**Solución:**
1. Abre **Servicios de Windows** (`services.msc`)
2. Busca "Ollama Service"
3. Asegúrate de que esté en estado "Running"
4. Si no existe, reinstala Ollama

### ❌ "Puerto 11434 ocupado"

**Causa:** Otro proceso está usando el puerto de Ollama.

**Solución:**
```bash
netstat -ano | findstr :11434
```
Identifica el PID y termina el proceso en el Administrador de Tareas.

### ❌ "Modelo no encontrado"

**Causa:** No descargaste el modelo o usaste un nombre incorrecto.

**Solución:**
```bash
ollama pull llama3.1:8b
```

### ❌ "Respuestas muy lentas"

**Causa:** Hardware insuficiente (RAM < 8GB).

**Solución:**
- Usa el modelo ligero: `ollama pull phi3:mini`
- Actualiza `.env` con `VITE_OLLAMA_MODEL=phi3:mini`

---

## Especificaciones Técnicas

### Modelo Recomendado: Llama 3.1 8B

- **Tamaño:** 4.7GB
- **RAM Requerida:** 8GB mínimo (16GB recomendado)
- **Contexto:** 128K tokens
- **Velocidad:** ~50-200ms por respuesta
- **Calidad:** Comparable a GPT-3.5

### API Endpoint

Ollama expone una API REST en `http://localhost:11434`:

**Verificar disponibilidad:**
```bash
curl http://localhost:11434/api/tags
```

**Generar respuesta:**
```bash
curl http://localhost:11434/api/generate -d '{
  "model": "llama3.1:8b",
  "prompt": "¿Cómo funciona el login en Listo POS?",
  "stream": false
}'
```

---

## Notas Importantes

> [!WARNING]
> **Privacidad de Datos**
> Aunque Ollama es local, asegúrate de no compartir información sensible en tus prompts si planeas usar modelos cloud como fallback.

> [!TIP]
> **Optimización de Rendimiento**
> - Cierra aplicaciones pesadas mientras usas Ollama
> - Considera usar un SSD para mejorar la velocidad de carga del modelo
- Si tienes GPU NVIDIA, Ollama la usará automáticamente para acelerar las respuestas

---

## Soporte

Si tienes problemas con Ollama, visita:
- **Documentación oficial:** https://ollama.ai/docs
- **GitHub:** https://github.com/ollama/ollama
- **Discord:** https://discord.gg/ollama
