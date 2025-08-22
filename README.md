# MCP TypeScript RAG Server

Un servidor **Model Context Protocol (MCP)** especializado en **RAG (Retrieval-Augmented Generation)** para documentación técnica. Permite indexar, buscar y extraer contenido de documentación web de manera inteligente usando **ChromaDB** y **scraping avanzado**.

## ✨ Características

### 🔧 **Herramientas MCP Disponibles**

- **`search-documentation`**: Búsqueda semántica en documentación indexada
  - Búsqueda por librería, categoría, keywords o general
  - Filtros por versión y tipo de contenido
  - Scoring de relevancia

- **`bulk-add-urls`**: Indexación masiva de sitios de documentación
  - Extracción automática de URLs de documentación
  - Procesamiento en lotes con metadatos enriquecidos
  - Soporte para extracción de contenido completo

- **`search-specific-documentation`**: Scraping directo de URLs específicas
  - Extracción de contenido limpio sin HTML
  - Procesamiento de múltiples URLs simultáneamente
  - Control de longitud de contenido

### 🏗️ **Arquitectura**

- **Backend**: TypeScript + Node.js
- **Base de datos vectorial**: ChromaDB para embeddings y búsqueda semántica
- **Scraping**: Cheerio + Axios con selectores inteligentes
- **Contenedores**: Docker/Podman con servicios orquestados
- **Testing**: Mocha + Chai + Sinon con cobertura de código

### 🎯 **Casos de Uso**

- Indexación de documentación de frameworks (React, Vue, Angular, etc.)
- Búsqueda inteligente en documentación técnica
- Extracción de contenido específico de APIs
- Creación de bases de conocimiento personalizadas

## 🚀 Instalación y Uso

### **Modo Producción (Recomendado para uso en MCP)**

1. **Construir y ejecutar los servicios:**
```bash
# Con Docker
docker compose up -d --build

# Con Podman (alternativa)
podman-compose up -d --build
```

2. **Configurar en VS Code/Claude Desktop:**
```json
{
  "mcpServers": {
    "mcp-documentation-rag": {
      "type": "stdio",
      "command": "docker",
      "args": [
        "exec", 
        "-i", 
        "mcp-aws-ts",
        "npx",
        "tsx",
        "main.ts"
      ]
    }
  }
}
```

### **Modo Desarrollo**

1. **Ejecutar en modo desarrollo con hot-reload:**
```bash
# Con Docker
docker compose -f docker-compose.dev.yml up -d --build

# Con Podman
podman-compose -f docker-compose.dev.yml up -d --build
```

2. **Configurar para desarrollo:**
```json
{
  "mcpServers": {
    "mcp-documentation-rag-dev": {
      "type": "stdio",
      "command": "docker",
      "args": [
        "exec",
        "-i",
        "mcp-ts-dev",
        "npx",
        "tsx",
        "main.ts"
      ]
    }
  }
}
```

### **Ejecución Local (Sin contenedores)**

1. **Instalar dependencias:**
```bash
npm install
```

2. **Ejecutar ChromaDB (necesario):**
```bash
docker run -d --name chromadb -p 8000:8000 chromadb/chroma:latest
```

3. **Ejecutar el servidor:**
```bash
npm start
```

4. **Configurar para local:**
```json
{
  "mcpServers": {
    "mcp-documentation-rag-local": {
      "type": "stdio",
      "command": "npx",
      "args": ["tsx", "/ruta/completa/al/proyecto/main.ts"]
    }
  }
}
```

## 🛠️ Scripts Disponibles

```bash
# Desarrollo
npm start                    # Ejecutar servidor localmente
npm run build               # Compilar TypeScript
npm run test                # Ejecutar tests
npm run test:watch          # Tests en modo watch
npm run test:coverage       # Tests con reporte de cobertura

# Docker
npm run docker:build        # Construir imagen Docker
npm run docker:run          # Ejecutar contenedor
```

## 📖 Ejemplos de Uso

### **1. Indexar Documentación de Tailwind CSS**
```typescript
// Usar la herramienta bulk-add-urls
{
  "baseUrl": "https://tailwindcss.com/docs",
  "libraryName": "tailwindcss",
  "version": "3.4.1",
  "defaultCategory": "documentation",
  "extractContent": true,
  "docMode": true
}
```

### **2. Buscar en Documentación Indexada**
```typescript
// Usar search-documentation
{
  "query": "responsive design utilities",
  "searchType": "general",
  "libraryName": "tailwindcss",
  "limit": 10
}
```

### **3. Extraer Contenido Específico**
```typescript
// Usar search-specific-documentation
{
  "urls": [
    "https://tailwindcss.com/docs/responsive-design",
    "https://tailwindcss.com/docs/hover-focus-and-other-states"
  ],
  "includeMetadata": true,
  "maxContentLength": 5000
}
```

## 🔧 Configuración

### **Variables de Entorno**
- `NODE_ENV`: Entorno de ejecución (production/development)
- `CHROMA_HOST`: Host de ChromaDB (default: chromadb)
- `CHROMA_PORT`: Puerto de ChromaDB (default: 8000)

### **Estructura de Directorios**
```
├── gateway/          # Conectores a servicios externos (ChromaDB, DynamoDB)
├── services/         # Lógica de negocio (RAG, Scraper)
├── tools/           # Herramientas MCP disponibles
├── shared/          # Tipos, constantes y utilidades
├── docker-compose.yml        # Configuración producción
├── docker-compose.dev.yml    # Configuración desarrollo
└── main.ts          # Punto de entrada del servidor
```

## 🧪 Testing

```bash
# Ejecutar todos los tests
npm test

# Tests con coverage
npm run test:coverage

# Test específico
npm run test:file gateway/dynamo.test.ts
```

## 🐛 Troubleshooting

### **Problemas Comunes**

1. **ChromaDB no conecta:**
   - Verificar que el contenedor esté ejecutándose
   - Comprobar conectividad de red entre contenedores

2. **Scraping falla:**
   - Verificar acceso a internet desde el contenedor
   - Revisar que las URLs sean accesibles

3. **MCP no responde:**
   - Comprobar configuración JSON en VS Code/Claude
   - Verificar logs del contenedor: `docker logs mcp-aws-ts`

### **Logs útiles:**
```bash
# Ver logs del servidor MCP
docker logs -f mcp-aws-ts

# Ver logs de ChromaDB
docker logs -f chromadb

# Modo desarrollo
docker logs -f mcp-ts-dev
```

## 🤝 Contribución

1. Fork el repositorio
2. Crear rama feature: `git checkout -b feature/amazing-feature`
3. Commit cambios: `git commit -m 'Add amazing feature'`
4. Push a la rama: `git push origin feature/amazing-feature`
5. Abrir Pull Request

### **Lineamientos de Desarrollo**
- Usar TypeScript estricto
- Añadir tests para nuevas funcionalidades
- Seguir convenciones de nomenclatura existentes
- Documentar APIs públicas

## 📄 Licencia

[ISC](LICENSE)

## 🏷️ Tags

`mcp` `rag` `typescript` `chromadb` `documentation` `scraping` `vector-search` `ai`
