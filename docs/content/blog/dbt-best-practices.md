---
title: Best Practices for dbt (Data Build Tool)
date: 2026-07-22
description: How to structure your dbt projects for cleaner, more maintainable data models.
---

As data teams grow, dbt projects can quickly become cluttered. Without clear structure and coding guidelines, you end up with slow runs, duplicate models, and confusing data lineage.

Here are the key best practices I follow to keep dbt projects maintainable:

### 1. Structure Models by Layers
Divide your models directory into three clear layers:
- **Staging (`stg_`)**: Light cleaning, renaming columns, and casting types directly on raw source tables. No joins or complex aggregations allowed here.
- **Intermediate (`int_`)**: Combine staging models, apply business logic, and perform intermediate joins. These models are not exposed to end users.
- **Marts (`fct_` and `dim_`)**: Dimensional modeling (Stars and Snowflakes). These are the final tables exposed to BI tools like Tableau or Looker.

### 2. Never Query Raw Sources Directly
Always use the `source` function in staging models, and use the `ref` function for downstream models. This creates the dependency graph (DAG) that dbt uses to determine run order.

### 3. Write Tests Proactively
dbt makes it easy to test your data. For every staging model, define basic tests in your `schema.yml` file:
- `unique`
- `not_null`
- `accepted_values`
- `relationships` (referential integrity)

By testing early, you catch data pipeline failures before they reach the executive dashboards.
