# ADR 001 Deterministic cohorts

## Context

A percentage rollout that picks subjects at random on every request, or that stores a row per subject, either flickers or turns the evaluator into a write path.

## Decision

Map `salt:flag key:subject` through SHA-256 and take the first 32 bits modulo 10,000. The subject is included when that bucket is below `rollout * 100`. `enabled=false` returns false before the hash runs. The salt is created with the flag and is not rotated by a normal update.

## Consequences

The same subject stays in or out while the rollout percentage only moves upward, because the bucket does not change. Lowering the percentage, or changing the salt, can remove subjects who were included. The evaluator does not store subject ids. A high-volume deployment would publish a snapshot of the flag, not a row per subject.
