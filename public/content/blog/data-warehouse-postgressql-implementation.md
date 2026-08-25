---
title: Data Warehouse and Star Schema Implementation with PostgreSQL using Medallion Architecture
date: 2026-08-25
description: Built an end-to-end data warehouse in PostgreSQL using Medallion architecture (Bronze → Silver → Gold), implementing Slowly Changing Dimension Type 2 (SCD2) to track historical changes and a star schema for analytics-ready reporting in Power BI.
---
In this project I will implement a complete data warehouse solution using Medallion Architecture including star schema and Slowly Changing Dimension Type 2 and a simple dashboard using Power BI.

## 1. Explore source data
We have data coming from two source systems CRM and ERP. The source data is available as CSV files on my local machine. <br>
The source csv files are `cust_info.csv`, `prd_info.csv`, `sales_details.csv` from CRM and `CUST_AZ12.csv`, `LOC_A101.csv` , `PX_CAT_G1V2.csv` from ERP. <br>
### Customer Schema(CRM source):
| cst_id | cst_key | cst_firstname | cst_lastname | cst_marital_status | cst_gndr | cst_create_date |
|---|---|---|---|---|---|---|
| 11000 | AW00011000 | Jon | Yang | M | M | 2025-10-06 |
## 2. Bronze Layer - Extract and Load

## 3. Silver Layer - Transformations

## 4. Gold Layer - Dimensional Modelling

## 5. Power BI Analytics

Here is a diagram representing the data architecture:

![Architecture](\images\Architecture.png)

## View the code on GitHub

🔗 **[GitHub Repository](https://github.com/K-Usman/PostgreSQL-Data-Warehouse-with-Medallion-Architecture)**

Here is the Power BI Dashboard created based on star schema answering basic analytics questions:
![BI Report](\images\report.png)
