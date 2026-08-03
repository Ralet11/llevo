# ADR-002 — Confirmación externa de pagos

Estado: aceptado
Fecha: 2026-08-02

## Decisión

Un pago se considera confirmado solo cuando el proveedor de pagos lo informa y Llevo lo valida.

## Motivo

Evita marcar como pagada una reserva solo porque el usuario abrió o volvió del checkout.

## Impacto para clientes

Senda debe indicar que una reserva queda pagada después de la confirmación del pago, no antes.
