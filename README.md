# BASURITA — Plataforma Municipal de Rastreo y Gestión de Recolección de Residuos

Sistema integral para el monitoreo en tiempo real de unidades recolectoras de basura, notificaciones por proximidad geográfica, operación sin conexión en campo y gestión operativa municipal.

---

## Arquitectura del Proyecto

```text
basurita/
├── backend/          # API REST en Laravel 11 + PostgreSQL + Laravel Sanctum
├── frontend-movil/   # App Ciudadano & Operador (Angular + Tailwind CSS v3 + Leaflet)
└── frontend-web/     # Panel Administrativo Web (Angular + Tailwind CSS v3 + Leaflet)