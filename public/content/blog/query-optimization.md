---
title: Query Optimization Techniques in PostgreSQL
date: 2026-09-02
description: A guide to sql query optimization and a detailed look at execution plans including indexes, join methods, statistics, query monitoring and postgres configuration parameters.
---
![Architecture](/images/indexed.jpg)


# Database Query Optimization: A Guide for Data & Analytics Engineers

Database optimization plays a critical role in data and analytics engineering. Instead of blindly provisioning more compute resources, writing efficient queries saves money and scales performance.

This post covers the core techniques you need to master query optimization, starting with how the database engine thinks.

---

## 1. Query Planning

Before optimizing, we need to understand how PostgreSQL executes a query under the hood. The optimization pipeline follows these key phases:

1. **Parsing & Rewriting:** The database breaks the query into a structural query tree and unpacks any views or shortcuts you've written.
2. **Plan Generation:** It generates multiple candidate execution plans and evaluates the statistics for each.
3. **Cost-Based Selection:** It picks the cheapest estimated plan based on those statistics.
4. **Execution:** It runs the chosen plan and returns your data.

---

## The Three Pillars of Optimization

Every query optimization technique generally falls into one of three buckets:

### 1. Giving the Planner Better Options
* **Adding Indexes:** Guide the planner away from expensive sequential scans to rapid index lookups.
* **Query Rewriting:** Restructure joins, filters, or subqueries so a cheaper execution path becomes physically possible.

### 2. Giving the Planner Better Information
* **Updating Statistics:** Run the `ANALYZE` command frequently. 
* **Accurate Volume Metrics:** Ensure the database accurately understands data distribution, cardinality, and row counts so cost estimates are realistic.

### 3. Giving the Planner Better Cost Assumptions
* **Hardware Alignment:** Adjust database configuration settings (such as `random_page_cost`, `effective_cache_size`, and work memories) to match your actual hardware capabilities (SSD speed, RAM allocation).

---

> **Tip:** Always inspect your execution plans using `EXPLAIN ANALYZE` before making changes. Measure twice, optimize once! 
  
## 2. Indexes  
**EXPLAIN command** : shows the estimated plan without running the query.  
   
```sql
EXPLAIN SELECT * FROM orders WHERE customer_id = 42;
```

**Execution Plan:**
```text
Gather  (cost=1000.00..26130.87 rows=22 width=27)
  Workers Planned: 2
  ->  Parallel Seq Scan on orders  (cost=0.00..25128.67 rows=9 width=27)
        Filter: (customer_id = 42)
```

### How do we know we need an index from the above results?
1. **High Cost for Few Rows:** `Cost=26130` for `22 rows`. Doing 26,000 units of work to find 22 items means the database is working incredibly hard to find a tiny amount of data.
2. **Sequential Scan with Filter:** Whenever you see `Seq Scan` with a `Filter` (WHERE clause), it means the database is reading the entire table from top to bottom just to throw 99% of it away.
3. **Parallel Workers:** PostgreSQL only decides to spin up parallel workers when it realizes a Sequential Scan is going to be massive and painfully slow for a single CPU core to handle.

---
**EXPLAIN ANALYZE command**: Actually executes the query and shows the costs.
```sql
EXPLAIN (ANALYZE, BUFFERS) SELECT * FROM orders WHERE customer_id = 42;
```

**Execution Plan:**
```text
Gather  (cost=1000.00..26130.87 rows=22 width=27) (actual time=10.754..102.813 rows=19 loops=1)
  Workers Planned: 2
  Workers Launched: 2
  Buffers: shared hit=14712
  ->  Parallel Seq Scan on orders  (cost=0.00..25128.67 rows=9 width=27) (actual time=3.626..56.996 rows=6 loops=3)
        Filter: (customer_id = 42)
        Rows Removed by Filter: 666660
        Buffers: shared hit=14712
Planning Time: 0.174 ms
Execution Time: 102.880 ms
```
*Notes:*
* `cost=26130.87` is the estimated cost. `rows=19` is actual rows. `loops=1` means gather operation happened one single time. `width=27` is the estimated average size of a single row (all columns combined, e.g., 27 bytes of memory)
* `Buffers: shared hit=14712` represents total memory usage. The database had to read 14,712 memory pages (about 117 MB of data). `shared hit` means every single page was already sitting in fast RAM.
* `loops=3` (in the Parallel Seq Scan) means 3 separate processes: 2 workers and 1 gather.
* `Execution Time: 102.880 ms` is always the outer node time (in this case, gather node time).
* `Buffers: shared hit=14741 dirtied=532` — a "dirty" page is a block of memory that has been changed and needs to be saved back to the hard drive later. Modified 532 pages of memory.

When you use `UPDATE` and then rollback, there are dead pages that can slow down your `SELECT` statements. So after a failed update or delete operation, you can run the following command to delete those pages:

```sql
VACUUM FULL ANALYZE orders;
```
*(Note: This creates a new orders table and deletes the old one. While `VACUUM FULL` is running, the orders table is locked for updates, inserts, etc.)*

### Running the same query after creating an index on `orders(customer_id)`:
```sql
CREATE INDEX idx_orders_customerid on orders(customer_id);
```

**Execution Plan:**
```text
Bitmap Heap Scan on orders  (cost=4.59..86.47 rows=21 width=27) (actual time=0.021..0.038 rows=19 loops=1)
  Recheck Cond: (customer_id = 42)
  Heap Blocks: exact=19
  Buffers: shared hit=22
  ->  Bitmap Index Scan on idx_orders_customer_id  (cost=0.00..4.58 rows=21 width=0) (actual time=0.015..0.015 rows=19 loops=1)
        Index Cond: (customer_id = 42)
        Buffers: shared hit=3
Planning Time: 0.086 ms
Execution Time: 0.058 ms
```

**Query execution step-by-step:**
* **Bitmap Index Scan:** Creates a bitmap, a map of memory locations pointing to the specific data blocks in the table that contain these rows. It reads 3 memory blocks from the index (`Buffers: shared hit=3`), and these were already cached in RAM.
* **Bitmap Heap Scan:** Uses the bitmap from the previous step to fetch actual values. `Buffers: shared hit=22` (19 heap blocks + 3 index blocks). `Heap Blocks: exact=19` means the DB has to open 19 data blocks.

*Note: Sometimes the planner ignores the index when the queried data is about 10% of all data and will use a seq scan. Because it is expensive to go back and forth (read the index and go back to the main table to fetch the actual row data).*

### Covering Index
A covering index is an index that contains all the columns a query needs, so PostgreSQL can potentially answer the query without reading the actual table (heap) - *ChatGPT*  
Build a normal, searchable index on `customer_id`. But while you are at it, secretly pack a copy of the `status` and `total_cents` data right next to it:

```sql
CREATE INDEX idx_orders_covering ON orders(customer_id) INCLUDE (status, total_cents); 
```

After creating the covering index, the following query will result in an **Index Only Scan**:

```sql
EXPLAIN (ANALYZE, BUFFERS)
SELECT status, total_cents FROM orders WHERE customer_id = 42;
```
```
"Index Only Scan using idx_orders_covering on orders  (cost=0.43..4.83 rows=23 width=11) (actual time=0.017..0.021 rows=19 loops=1)"
"  Index Cond: (customer_id = 42)"
"  Heap Fetches: 0"
"  Buffers: shared hit=4"
"Planning:"
"  Buffers: shared hit=17"
"Planning Time: 0.200 ms"
"Execution Time: 0.041 ms"

```
*Note: Sometimes we need to use `VACUUM ANALYZE orders` to update the visibility map.*  
### Partial Index  
If you mostly filter a subset of data, create index only on that subset, this is smaller, faster and cheaper to maintain.  
```sql
CREATE INDEX idx_orders_pending ON orders(created_at) WHERE status = 'pending';

EXPLAIN ANALYZE
SELECT * FROM orders WHERE status = 'pending' AND created_at > now() - interval '7 days';
```
### Expression Index  
A index only helps if the  where clause matches its exact form. Wrapping an indexed column in a function will not use the index.  
```sql
-- Won't use a plain index on email:
EXPLAIN ANALYZE SELECT * FROM customers WHERE lower(email) = 'user500@example.com';

-- Fix: index the expression itself
CREATE INDEX idx_customers_email_lower ON customers(lower(email));
EXPLAIN ANALYZE SELECT * FROM customers WHERE lower(email) = 'user500@example.com';
```
---

## Statistics — Feeding the Planner Good Information

From `pg_statistics`, you can see the table statistics that Postgres uses to create execution plans:  

```sql
SELECT attname, n_distinct, most_common_vals, correlation
FROM pg_stats
WHERE tablename = 'orders' AND attname = 'customer_id';
```

### 1. `n_distinct`
Indicates how many different customers exist in the table. 
* **Positive number (e.g., 5000):** There are exactly 5000 unique customers. Happens when the number of unique values in a column is fixed and rarely changes.
* **Negative number (e.g., -0.5):** This is a percentage. It means 50% of values are unique. Happens when the number of unique values scales up as the table grows.

**How is it calculated?**  
The database does a "taste test." It reads 30,000 rows by default and decides based on how data is changing to give `n_distinct` a positive or negative value. 
* *Positive:*  When the number of unique values stops growing in the first 30,000 rows.
* *Negative:*  By the end of 30,000 reads, it finds 25,000 unique customers. The database calculates the ratio 25,000 / 30,000 = 0.83. So `n_distinct = -0.83` (83% of customers are unique).
* *10% Tipping point:*  If the database estimates that the total number of unique values is less than 10% of the total rows in the table, it usually decides the data has flatlined and assigns a positive exact number. (e.g., 90,823 which is 4.5% of the whole table of 2M records).

### 2. `most_common_vals`
Returns the most frequent record (the outlier actually). In our query, it might be `1`. If `customer_id=1` is the most frequent record in the table with 40,010 rows, and the planner finds the searched record is in `most_common_vals`, it avoids the index and does a **Bitmap Scan** in which database stays at the index, reads everything first, writes addresses of all 40,010 in your RAM, and builds the bitmap (i.e., Page 5 contains 20 rows, Page 12 contains 5 rows, etc.). Now the database takes this to the main table and gets the relevant rows.

### 3. `correlation`
It measures how neatly your data is packed on the physical hard drive, ranging between -1 to 1.  `1` means the data on the hard drive is physically sitting in the exact same order as the `customer_ids`. Customer 1's orders are all grouped together, followed by Customer 2, etc.

### Fixing Bad Statistics
When a query is slow, compare your `EXPLAIN ANALYZE` output to the `pg_stats` table:

`n_distinct(Fix bad row estimates)`  
If there is a massive gap between expected rows and actual rows (e.g., rows=10 vs actual rows=50,000), check the `n_distinct` value. Expected rows are calculated by dividing total rows by `n_distinct` rows. If statistics show `n_distinct=100,000` unique rows, `1,000,000 / 100,000 = 10` rows per value. The planner thinks it has to find only 10 rows and uses an index, but in reality, there are 50,000 rows, and reading these via an index is slower than a sequential scan.  

`ANALYZE {tablename}` reads a random sample using formula: `300 * statistics_target = Sample Size`. By default, `statistics_target=100`, which becomes 30,000. For a 50 million record table, 30,000 is too small to know the diversity, resulting in an inaccurate `n_distinct`. We need to update the statistics so planner can get better sense of table data.  

```sql
ALTER TABLE orders ALTER COLUMN customer_id SET STATISTICS 1000;
ANALYZE orders;
```
*(This updates `statistics_target` to 1000, making the sample size 300,000, and updates the `n_distinct` values).*

`most_common_vals(Fix data skew)`  
If 95% of records belong to customer 1, while thousands of normal customers share the remaining 5%, create a partial index that ignores this customer and provides a hyper-fast index for normal customers:

```sql
CREATE INDEX idx_normal_customers ON orders(customer_id) WHERE customer_id != 1;
```

`correlation(Force physical ordering)`  
If you see a slow Bitmap Heap Scan where the database has to open thousands of Heap Blocks (bouncing all over the hard drive) just to find a few hundred rows, and your `correlation` score is near 0.00, the data is physically a mess. Use the `CLUSTER` command to force PostgreSQL to physically rewrite the entire table on the hard drive so the rows are neatly packed together based on your index:

```sql
CLUSTER orders USING idx_orders_customer_id;
```

### Extended Statistics
Suppose if `customer_id 99` always does a test order whose `status=cancelled`, and in a table with 1,000,000 orders, `customer_id 99` has 10% of orders and cancelled orders are also 10%.

```sql
SELECT * FROM orders WHERE customer_id = 99 AND status = 'cancelled';
```
The planner multiplies this value `0.1 * 0.1 = 0.1 = 1%`, which is 10,000 rows. Since the estimate is small, it will use an index scan. But in reality, the query returns 100,000 records (10%) because *all* of customer 99's orders are cancelled.

Fix this by creating extended statistics between `customer_id` and `status`:  
```sql
CREATE STATISTICS orders_stats (dependencies, ndistinct) ON customer_id, status FROM orders;
ANALYZE orders;
```

The `ndistinct` (N-Distinct) part exists specifically to fix bad math when you use `GROUP BY`:  
```sql
SELECT customer_id, status, COUNT(*) 
FROM orders 
GROUP BY customer_id, status;
```
Suppose your orders table has 100,000 unique `customer_ids` and 5 unique `statuses`. Postgres multiplies `5 * 100,000 = 500,000` unique groups. The planner thinks it doesn't have enough RAM, writes data to the hard drive, sorts it, and then groups it. In reality, most customers have 1 or 2 statuses, so there are only about 110,000 combinations. Adding `ndistinct` to your statistics and running `ANALYZE` forces PostgreSQL to count the actual number of unique combinations.

---

## JOINs: Access Methods and Order

PostgreSQL picks from three join algorithms per join and picks the join order for multi-table queries:

1. **Hash Join:** Takes the smaller of two tables and loads it into a temporary dictionary (a hash) in RAM. Then it sweeps through the larger one checking for matches. Good default for large, unsorted, unindexed sets. PostgreSQL uses this for bulk data processing. It is the fastest way to join two large, unindexed datasets or when returning a massive percentage of a table. *The small table goes in the bottom node and is executed first.*
2. **Nested Join (Nested Loop):** Works like a for loop. For every single row in the top table, it searches the bottom table for a match. PostgreSQL uses this when one or both tables are very small. If you see a Nested Loop dealing with millions of rows, it is usually a sign of a missing index or bad statistics. *The small table goes in the top node. A nested loop runs the bottom step once for every row in the top step.*
3. **Merge Join:** PostgreSQL sorts both tables by the join column (like `customer_id`). Once both tables are perfectly ordered, it "zips" them together in a single pass. PostgreSQL uses this when dealing with massive tables that are either already indexed on the join columns, or when a Hash Join won't fit into your server's RAM. *Small and large tables run at the same time. Requires both tables to be perfectly sorted. Postgres pulls 1 row from both tables and compares.*

**Example Hash Join Execution Plan:**
```text
Hash Join  (cost=2332.75..43288.22 rows=407950 width=25) (actual time=608.178..4717.183 rows=432728 loops=1)
  Hash Cond: (o.customer_id = c.id)
  ->  Seq Scan on orders o  (cost=0.00..35574.00 rows=2050000 width=8) (actual time=12.669..1435.261 rows=2050000 loops=1)
  ->  Hash  (cost=2084.00..2084.00 rows=19900 width=25) (actual time=595.152..595.156 rows=20000 loops=1)
        Buckets: 32768  Batches: 1  Memory Usage: 1428kB
        ->  Seq Scan on customers c  (cost=0.00..2084.00 rows=19900 width=25) (actual time=0.089..574.734 rows=20000 loops=1)
              Filter: (country = 'DE'::text)
              Rows Removed by Filter: 80000
Planning Time: 52.872 ms
Execution Time: 4809.054 ms
```
*Notes:*
* **Memory Usage: 1428kB:** Amount of RAM used to hold records. Postgres has a default `work_mem` of 4MB. As long as Memory Usage stays below your `work_mem`, the query will run fast.
* **Buckets: 32768:** Postgres divides memory into buckets and runs a hash function to assign a row a bucket. 32768 buckets for 20000 rows means most buckets will contain just one or zero rows.
* **Batches: 1:** Means the hash fits into the server's RAM perfectly. If it was 4, it means the dictionary was split into chunks (batches) to keep one batch in RAM and write the others to the drive.

*Tip: You can change the join order and join method by updating statistics (for example, creating extended statistics on dependencies).*

---

## CTEs (Common Table Expressions)

```sql
WITH all_orders AS (
    SELECT customer_id, total_cents, status 
    FROM orders
)
SELECT * FROM all_orders WHERE customer_id = 42;
```
When CTEs are written without `MATERIALIZED`, the planner will virtually erase the CTE and merge it directly into the main query before executing it. Because it is **NOT MATERIALIZED**, Postgres looks at the outer query (`WHERE customer_id = 42`), takes that filter, and pushes it down inside the CTE.

When CTEs are `MATERIALIZED`, you build an optimization fence between the CTE and the main query. The CTE will execute on its own, save the result into a temporary memory table, and only then run the rest of the query against that temporary table.

```sql
WITH all_orders AS MATERIALIZED (
    SELECT customer_id, total_cents, status 
    FROM orders
)
SELECT * FROM all_orders WHERE customer_id = 42;
```
If you materialize unnecessarily, the query can become slow. It might do a seq scan and write temporary files, completely ignoring your indexes, all because the fence blocked it from seeing the filter early on.

**When to use MATERIALIZED:**
1. When the CTE does a heavy calculation and the main query joins to that CTE three different times. Here you can force it to be materialized and save the calculation to be used for joins.
2. Sometimes pushing filters to the main query is a bad idea. If you have a complex CTE, the planner tries to push a complex join or filter inside of it, the planner statistics might break, causing it to pick a nested loop. By using materialized, you force the planner to finalize the CTE first and then look at the exact size of the resulting temporary table.

---

## Width Matters
`SELECT *` should not be used. Fetching only needed columns reduces IO and can enable index-only scans.

---

## LIMIT
Without an index on `created_at`, the following query sorts all 2M rows before taking 10. With an index, Postgres will do an index scan backward.

```sql
EXPLAIN ANALYZE SELECT * FROM orders ORDER BY created_at DESC LIMIT 10;
```

---

## Postgres Configuration Parameters

### Memory Allocation Parameters:
* **`shared_buffers`:** Dedicated RAM Postgres reserves to cache table and index data. Acts as the database's primary working area. Configure this while provisioning a server. The industry standard is 25% of your total RAM.
* **`work_mem`:** Maximum RAM allowed per operation. Increase this if your `EXPLAIN ANALYZE` shows `Sort Method: external merge Disk` or Hash Joins with multiple Batches using `SET work_mem = '512MB'`.

### Query Planner Parameters:
* **`effective_cache_size`:** Tells the query planner how much total memory (PostgreSQL's cache + the Operating System's file cache) is likely available. Set this on a new server to roughly 50% to 75% of your total system RAM. A higher value encourages the planner to use Index Scans; a lower value pushes it toward Sequential Scans. Only requires a configuration reload.
* **`random_page_cost`:** A penalty multiplier the planner uses to estimate the cost of a non-sequential disk read (like bouncing around an index). The default is 4.0, which assumes the database is running on slow, spinning magnetic hard drives. Update this immediately if your database uses Solid State Drives (SSDs) or NVMe storage. Lower it to 1.1. This single change prevents the planner from artificially avoiding Index Scans on modern, fast storage. Only requires a reload.
* **`default_statistics_target`:** Dictates how much data the `ANALYZE` command samples. The default is 100, which samples 30,000 random rows to build the metadata the planner relies on. Increase this if the planner continually makes bad row-count estimates for complex queries on large tables. While you can change it globally, it is much safer to target only problematic columns using: `ALTER TABLE table_name ALTER COLUMN col_name SET STATISTICS 500;`

---

## Tools for Ongoing Monitoring

### 1. Monitor resource-heavy queries:
```sql
CREATE EXTENSION IF NOT EXISTS pg_stat_statements; 
-- (needs shared_preload_libraries = 'pg_stat_statements' in postgres.config file)

SELECT query, calls, total_exec_time, mean_exec_time, rows
FROM pg_stat_statements
ORDER BY total_exec_time DESC
LIMIT 10;
```
* `query`: Normalized template of the SQL statement.
* `calls`: Total number of times that query has been executed since the statistics were last reset.
* `total_exec_time`: Cumulative time (in ms) spent running this query across all of its calls. Ultimate metric for finding what is bogging down your system.
* `mean_exec_time`: Average execution time per single run.
* `rows`: Total number of rows retrieved or affected by this query across all calls.
* *How to reset record statistics:* `SELECT pg_stat_statements_reset();`

### 2. Auto Explain (Logs explain output for slow queries automatically)
In `postgresql.conf`, write the following:
```ini
shared_preload_libraries = 'auto_explain'
auto_explain.log_min_duration = '200ms'
auto_explain.log_analyze = true
auto_explain.log_buffers = true
```
If a query takes more than 200 ms, it will trigger an automatic `EXPLAIN ANALYZE` behind the scenes. PostgreSQL will write the complete execution plan,including actual execution times, row counts, and memory buffer usage directly into the server log file at the exact moment the query finishes.

### 3. Find unused indexes and scan patterns
**Indexes never used (candidates for removal they still cost write overhead):**
```sql
SELECT relname, indexrelname, idx_scan
FROM pg_stat_user_indexes
WHERE idx_scan = 0;
```

**Seq scan vs index scan ratio per table:**
```sql
SELECT relname, seq_scan, idx_scan, seq_tup_read, idx_tup_fetch
FROM pg_stat_user_tables
ORDER BY seq_scan DESC;
```

---

## Common Patterns to Look for in Execution Plans

### 1. Function/Expression wrapping an indexed column:
If you have a normal index on `email`, writing `WHERE lower(email) = 'john@example.com'` destroys performance because SQL does not know the lowercase of the row until it actually performs the `lower` function. It gives up the index completely and does a seq scan.
* **Fix by indexing:** `CREATE INDEX idx_customers_lower_email ON customers (lower(email));`
* **Fix by rewriting:** If you want to find all orders placed today: `WHERE created_at::date = '2026-09-02';` casting blinds the index. Instead, do this: `WHERE created_at >= '2026-09-02 00:00:00' AND created_at < '2026-09-03 00:00:00';`
* *Rule: Never cast or apply transformations on the column. Always do the math on the right side of the equal sign.*

### 2. Type Mismatch:
When you compare two different data types, PostgreSQL forcefully casts one so they match. If it silently casts the indexed column, the index is blinded.
* **The Mismatched Join:** `JOIN new_orders ON c.id = o.customer_id;` (`c.id` is varchar and `o.customer_id` is BIGINT). Postgres casts the text column to a number, ignoring the text index (Seq Scan). Fix by altering the table to match foreign keys or manually cast the non-indexed key.
* **The Literal Value Mismatch:** `WHERE zip_code = 61348;` (where zip_code is varchar). This casts `zip_code` to int. Fix by adding quotes: `WHERE zip_code = '61348';`

### 3. Leading wildcard with LIKE:
`LIKE '%ith'` forces the database to read the entire table from A to Z because an alphabetically sorted index cannot jump in between words to find a sequence.
* **Fix 1: Trigram index for substrings (partial strings like URL or email):** The `pg_trgm` extension breaks strings into overlapping 3-letter chunks and indexes those. 
  ```sql
  CREATE EXTENSION pg_trgm;
  CREATE INDEX idx_customers_email_trgm ON customers USING gin (email gin_trgm_ops);
  ```
* **Fix 2: Full-Text Search (Whole words in large text):** Trigrams use too much memory for blog posts or descriptions. Use native Full-Text Search instead.
  ```sql
  CREATE INDEX idx_products_description_fts ON products USING gin (to_tsvector('english', description));
  
  EXPLAIN ANALYZE 
  SELECT product_name FROM products 
  WHERE to_tsvector('english', description) @@ to_tsquery('english', 'run');
  ```

### 4. OR across different columns:
`WHERE email_address = 'usman@example.com' OR username = 'usman88';` (Seq Scan). A composite index only works if you use AND.
* **Fix: Split and Union All**
  ```sql
  SELECT id, email_address, username FROM users WHERE email_address = 'usman@example.com'
  UNION ALL
  SELECT id, email_address, username FROM users WHERE username = 'usman88';
  ```
  Or create two separate indexes for each column.

### 5. Offset and Keyset
`SELECT * FROM orders ORDER BY created_at DESC LIMIT 20 OFFSET 100000;` Postgres reads the first 100,000 rows and throws them away. CPU and memory cost grows linearly.
* **The Fix: Keyset Pagination** tells the database to give the next 20 rows that come immediately after the last row you just looked at using a "bookmark".
  ```sql
  SELECT * FROM orders 
  WHERE created_at < '2026-09-02 01:15:00' 
  ORDER BY created_at DESC 
  LIMIT 20;
  ```

### 6. Estimated vs Actual Row Mismatch:
A massive gap between estimated rows and actual rows is a performance issue (e.g., estimating 5 rows, triggering a nested loop, but returning 50,000 rows).
* **Fix 1:** Recalculate statistics via `ANALYZE orders;`
* **Fix 2:** Increase sample size if the default `statistics=100` (30,000 rows) misses data patterns: `ALTER TABLE orders ALTER COLUMN client_id SET STATISTICS 500; ANALYZE orders;`

---

## A Repeatable Optimization Workflow
1. Identify a slow/expensive query via `pg_stat_statements` or app-level slow logs.
2. Run `EXPLAIN (ANALYZE, BUFFERS)` on it.
3. Look for: sequential scans on large tables, large estimate/actual row gaps, disk-spilling sorts/hashes, nested loops over huge row counts.
4. Form one hypothesis (missing index / stale stats / bad rewrite / config mismatch).
5. Apply one change.
6. Re-run `EXPLAIN (ANALYZE, BUFFERS)`, compare cost, actual time, and buffer counts against the baseline you captured in step 2.
7. Keep the change only if it measurably helps; revert otherwise.


