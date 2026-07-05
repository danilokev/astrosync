# AstroSync

_Proyecto [ABP](https://eps.ua.es/es/ingenieria-multimedia/presentacion-de-ingenieria-multimedia.html#aprendizaje-basado-proyectos) del Grado en Ingeniería Multimedia de la Universidad de Alicante._

_Planetario web en 3D que permite a los usuarios explorar el cielo de forma interactiva segun su ubicacion o cualquier punto del planeta. La plataforma muestra estrellas, planetas y constelaciones en tiempo real, junto con informacion detallada de cada astro. El usuario puede cambiar de localizacion mediante una vista global de la Tierra, guardar lugares y cuerpos celestes en favoritos, y consultar un mapa de contaminacion luminica que indica las zonas optimas para la observacion. Ademas, integra datos meteorologicos para evaluar las condiciones del cielo, permite subir fotografias personales a una galeria y ofrece un catalogo de eventos astronomicos con animaciones y localizacion del fenomeno. Como complemento, incluye un chatbot especializado en astronomia que responde preguntas y propone actividades interactivas para aprender sobre el cosmos._

## Empezando

_Estas instrucciones te permitiran obtener una copia del proyecto en funcionamiento en tu maquina local para propositos de desarrollo y pruebas._

### Pre-requisitos

_Debe tener instalado **Node.js** y **MongoDB** en el equipo de desarrollo. Las siguientes lineas muestran como hacerlo para **Ubuntu 22.04**:_

```sh
sudo apt update
sudo apt install npm
sudo npm clean -f
sudo npm i -g n
sudo n stable
```

_MongoDB:_

```sh
sudo apt update
sudo apt install -y mongodb
sudo systemctl start mongodb
```

### Instalacion

_Clonar el repositorio:_

```sh
git clone https://github.com/danilokev/astrosync.git
```

_Instalar dependencias del backend:_

```sh
cd astrosync/backend
npm i
```

_Instalar dependencias del frontend:_

```sh
cd ../frontend
npm i
```

_Configurar variables de entorno (backend):_

```sh
cp backend/.env.example backend/.env
# Editar .env con tus credenciales
```

_Iniciar el backend:_

```sh
cd backend
npm start
```

_Iniciar el frontend:_

```sh
cd frontend
ng serve
```

## API Reference

|                             Verbo HTTP | Ruta                        | Descripcion                             |
| -------------------------------------: | :-------------------------- | :-------------------------------------- |
|   <span style="color:green">GET</span> | /api/auth/check             | Verificar estado de autenticacion       |
|   <span style="color:green">GET</span> | /api/auth/google            | Iniciar sesion con Google OAuth         |
| <span style="color:yellow">POST</span> | /api/auth/login             | Iniciar sesion con email y contrasena   |
| <span style="color:yellow">POST</span> | /api/auth/register          | Registrar nuevo usuario                 |
| <span style="color:yellow">POST</span> | /api/auth/logout            | Cerrar sesion                           |
|   <span style="color:green">GET</span> | /api/weather                | Pronostico meteorologico de 7 dias      |
|   <span style="color:green">GET</span> | /api/weather/evaluate       | Evaluar condiciones para observacion    |
|   <span style="color:green">GET</span> | /api/celestial/star         | Informacion de estrella desde Wikidata  |
|   <span style="color:green">GET</span> | /api/celestial/cuerpo       | Informacion de planeta o cuerpo celeste |
|   <span style="color:green">GET</span> | /api/stars                  | Listar estrellas con filtros            |
|   <span style="color:green">GET</span> | /api/stars/search           | Buscar estrellas por termino            |
| <span style="color:yellow">POST</span> | /api/stars/import           | Importar estrellas desde CSV            |
|   <span style="color:green">GET</span> | /api/cuerposCelestes        | Listar cuerpos celestes                 |
|   <span style="color:green">GET</span> | /api/cuerposCelestes/search | Buscar cuerpos celestes                 |
| <span style="color:yellow">POST</span> | /api/cuerposCelestes        | Crear cuerpo celeste                    |
|    <span style="color:blue">PUT</span> | /api/cuerposCelestes/:id    | Actualizar cuerpo celeste               |
|  <span style="color:red">DELETE</span> | /api/cuerposCelestes/:id    | Eliminar cuerpo celeste                 |
|   <span style="color:green">GET</span> | /api/eventos                | Listar eventos astronomicos             |
|   <span style="color:green">GET</span> | /api/eventos/proximos       | Proximos 5 eventos                      |
|   <span style="color:green">GET</span> | /api/localizaciones         | Listar localizaciones del usuario       |
| <span style="color:yellow">POST</span> | /api/localizaciones         | Crear localizacion                      |
|  <span style="color:red">DELETE</span> | /api/localizaciones/:id     | Eliminar localizacion                   |
|   <span style="color:green">GET</span> | /api/fotos                  | Listar fotos del usuario                |
| <span style="color:yellow">POST</span> | /api/fotos                  | Subir foto                              |
|  <span style="color:red">DELETE</span> | /api/fotos/:id              | Eliminar foto                           |
|   <span style="color:green">GET</span> | /api/favoritos              | Listar favoritos                        |
| <span style="color:yellow">POST</span> | /api/favoritos              | Anadir favorito                         |
|  <span style="color:red">DELETE</span> | /api/favoritos/:id          | Eliminar favorito                       |
|   <span style="color:green">GET</span> | /api/constelaciones/search  | Buscar constelaciones                   |
| <span style="color:yellow">POST</span> | /api/dialogflow/webhook     | Webhook para chatbot Dialogflow         |
|   <span style="color:green">GET</span> | /api/metrics/overview       | Metricas de uso                         |
| <span style="color:yellow">POST</span> | /api/suscripcion            | Suscripcion por correo electronico      |

## Construido con

- [Angular 17](https://angular.io/) - Framework frontend
- [Express](https://expressjs.com/) - Framework backend para Node.js
- [MongoDB](https://www.mongodb.com/) - Base de datos NoSQL
- [Mongoose](https://mongoosejs.com/) - ODM para MongoDB
- [Three.js](https://threejs.org/) - Motor 3D para el planetario
- [MapLibre GL](https://maplibre.org/) - Mapas interactivos
- [Chart.js](https://www.chartjs.org/) - Graficos y visualizacion de datos
- [Passport.js](https://www.passportjs.org/) - Autenticacion (Google OAuth 2.0)
- [JWT](https://jwt.io/) - Autenticacion basada en tokens
- [Bootstrap 5](https://getbootstrap.com/) - Diseno responsive
- [Open-Meteo](https://open-meteo.com/) - API meteorologica
- [Wikidata](https://www.wikidata.org/) - Datos de cuerpos celestes
- [jsPDF](https://github.com/parallax/jsPDF) - Generacion de PDF
- [epub-gen](https://github.com/cyrilis/epub-gen) - Generacion de EPUB
- [Sharp](https://sharp.pixelplumbing.com/) - Procesamiento de imagenes

## Autores

- **Kevin Danilo Analuisa Ortiz** - [danilokev](https://github.com/danilokev)
- **Diana Shilova** - [Diana-Shi1ova](https://github.com/Diana-Shi1ova)
- **Anthony Ubillús Avendaño** - [Anthua22](https://github.com/Anthua22)
- **Daniel Pinteño Llerena** - [DanielPintenyo](https://github.com/DanielPintenyo)
- **Jose Alberto Garcia Pedreño** - [JoseCTESP](https://github.com/JoseCTESP)

## Licencia

Este proyecto esta bajo la Licencia GNU General Public License v3 - mira el archivo [LICENSE](LICENSE) para detalles.
