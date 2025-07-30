# MCP AWS TypeScript

Microservice Configuration Platform (MCP) es una herramienta para gestionar parámetros de configuración en DynamoDB para microservicios en AWS.

## Requisitos Previos

- Node.js 18 o superior
- npm o yarn
- AWS CLI configurado con perfiles locales
- Acceso a tablas de DynamoDB de AWS

## Instalación

1. Clona el repositorio:
   ```bash
   git clone <repo-url>
   cd mcp-aws-ts
   ```

2. Instala las dependencias:
   ```bash
   npm install
   # o
   yarn install
   ```

3. Compila el proyecto:
   ```bash
   npm run build
   ```

## Configuración de AWS

1. Asegúrate de tener configurado tu perfil de AWS:
   ```bash
   aws configure --profile tu-perfil
   ```

2. Verifica que puedas acceder a AWS:
   ```bash
   aws sts get-caller-identity --profile tu-perfil
   ```

## Uso

### Consultar Parámetros

Para consultar parámetros de un microservicio:

```bash
npm run cli query-parameters-dynamo -- --environment qa --profile tu-perfil --usrv_name usrv-card --region us-east-1
```

### Crear/Actualizar Parámetro

Para crear o actualizar un parámetro:

```bash
npm run cli put-parameter-dynamo -- \
  --environment qa \
  --profile tu-perfil \
  --usrv_name usrv-card \
  --short_name TIMEOUT_TRANSACTIONS_TABLES \
  --region us-east-1 \
  --value '{"redeban":"qa-usrv-card-redeban-timedOutTransactions"}' \
  --description "Configuración de tablas de transacciones"
```

### Variables de Entorno

Puedes configurar variables de entorno para parámetros comunes:

```bash
export AWS_PROFILE=tu-perfil
export AWS_REGION=us-east-1
export ENVIRONMENT=qa
```

### Scripts Disponibles

- `npm run build`: Compila el proyecto TypeScript
- `npm run start`: Inicia la aplicación
- `npm run test`: Ejecuta las pruebas
- `npm run lint`: Ejecuta el linter
- `npm run format`: Formatea el código

## Estructura del Proyecto

- `/gateway`: Clientes para servicios externos (DynamoDB, etc.)
- `/tools`: Comandos disponibles en la CLI
- `/test`: Pruebas unitarias y de integración

## Convenciones

- Los nombres de parámetros siguen el formato: `usrv-{servicio}-{NOMBRE_PARAMETRO}`
- Los valores pueden ser strings o objetos JSON serializados
- Los scopes siguen el formato: `/{entorno}/{perfil-aws}/{nombre-servicio}`

## Solución de Problemas

### Errores de Autenticación

```
Error: Unable to locate credentials
```

Asegúrate de que:
1. El perfil de AWS está configurado correctamente
2. Las credenciales no han expirado
3. El perfil tiene los permisos necesarios

### Errores de Tabla No Encontrada

```
ResourceNotFoundException: Requested resource not found
```

Verifica que:
1. El nombre de la tabla existe en la región especificada
2. El perfil tiene permisos para acceder a la tabla
3. El entorno (qa/dev/prod) está correctamente especificado

## Contribución

1. Crea un fork del repositorio
2. Crea una rama para tu feature (`git checkout -b feature/awesome-feature`)
3. Haz commit de tus cambios (`git commit -m 'Add some awesome feature'`)
4. Haz push a la rama (`git push origin feature/awesome-feature`)
5. Abre un Pull Request

## Licencia

[MIT](LICENSE)

## Development Setup
Test locally mcp with inspector

```bash
npx -y @modelcontextprotocol/inspector npx -y tsx main.ts 
```

### Windsurf Configuration

Add this to your Windsurf config:

```json
"mcp-aws-ts": {
  "command": "npx",
  "args": [
    "-y",
    "tsx",
    "/route-of-this-project/mcp-aws-ts/main.ts"
  ]
}
```
