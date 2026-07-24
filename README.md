# Encuesta de Género SSMOCC — Streamlit

Plataforma institucional para administrar ciclos de la Encuesta Comunidad Funcionaria, recibir respuestas anónimas, calcular indicadores, visualizar resultados y generar un informe ejecutivo.

## Características

- Encuesta pública de 39 preguntas.
- Acceso administrativo protegido.
- Ciclos en estado **Borrador**, **Activo** y **Finalizado**.
- Configuración autogestionada de preguntas e indicadores.
- Dashboard con protección de resultados cuando `n < 5`.
- Histórico y fotografía de resultados al finalizar cada ciclo.
- Informe ejecutivo descargable.
- Persistencia permanente en una planilla privada de Google Sheets.
- Registro de auditoría.

## Importante sobre la persistencia

Streamlit Community Cloud puede suspender o reiniciar la aplicación. Por eso las respuestas no se guardan dentro del servidor de Streamlit: se registran en Google Sheets. Aunque la aplicación “duerma”, se actualice desde GitHub o reinicie, los datos permanecen en la planilla privada.

El archivo SQLite se usa solamente como respaldo para ejecutar el proyecto en un computador local.

## 1. Crear la planilla permanente

1. Cree una planilla nueva en Google Sheets.
2. Copie el identificador ubicado entre `/d/` y `/edit` en su URL.
3. Cree una cuenta de servicio en Google Cloud y descargue su archivo JSON.
4. Comparta la planilla como **Editor** con el correo `client_email` de esa cuenta.

La aplicación creará automáticamente las hojas:

- `ciclos`
- `respuestas`
- `auditoria`

## 2. Publicar en Streamlit Community Cloud

1. Ingrese a [share.streamlit.io](https://share.streamlit.io).
2. Seleccione **Create app**.
3. Repositorio: `barolaro/encuesta-genero-ssmocc`.
4. Rama: `main`.
5. Archivo principal: `app.py`.
6. En **Advanced settings → Secrets**, copie la estructura de `.streamlit/secrets.example.toml`.
7. Reemplace los valores con las credenciales reales.
8. Presione **Deploy**.

## 3. Accesos

- Encuesta pública: URL principal entregada por Streamlit.
- Administración: agregue `?modo=admin` al final de la URL.

Ejemplo:

```text
https://su-aplicacion.streamlit.app/?modo=admin
```

## Seguridad

No escriba la contraseña ni las credenciales de Google directamente en `app.py`. El archivo `.streamlit/secrets.toml` está excluido de GitHub. Configure esos valores únicamente en los secretos de Streamlit Cloud.

Aunque técnicamente es posible usar una contraseña sencilla, se recomienda una clave de al menos 12 caracteres con letras, números y símbolos.

## Ejecución local

```bash
python -m venv .venv
source .venv/bin/activate  # Windows: .venv\Scripts\activate
pip install -r requirements.txt
streamlit run app.py
```

Sin secretos configurados, la aplicación utilizará SQLite local para facilitar las pruebas.

