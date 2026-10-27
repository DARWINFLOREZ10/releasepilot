# ADR 002 Optimistic audit

## Context

Two operators can save the same flag. Last-write-wins hides which change landed. An audit row written after the update can also disagree with the row if the process stops between the two statements.

## Decision

Updates require the version the operator read. The `UPDATE` and the audit insert run in one `BEGIN IMMEDIATE` transaction. A mismatched version rolls back and the API returns 409. The audit stores the previous row and the next row.

## Consequences

A stale save cannot overwrite a newer rollout. The audit is the history of committed changes, not of attempts. There is one admin key and one SQLite file, so this does not cover per-user attribution or more than one app instance.
