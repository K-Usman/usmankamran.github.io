---
title: Data Warehouse and Star Schema Implementation with PostgreSQL using Medallion Architecture
date: 2026-08-25
description: Built an end-to-end data warehouse in PostgreSQL using Medallion architecture (Bronze → Silver → Gold), implementing Slowly Changing Dimension Type 2 (SCD2) to track historical changes and a star schema for analytics-ready reporting in Power BI.
---
In this project I will implement a complete data warehouse solution using Medallion Architecture including star schema and Slowly Changing Dimension Type 2 and a simple dashboard using Power BI.

## 1. Explore source data
We have data coming from two source systems CRM and ERP. The source data is available as CSV files on my local machine.  
The source csv files are `cust_info.csv`, `prd_info.csv`, `sales_details.csv` from CRM and `CUST_AZ12.csv`, `LOC_A101.csv` , `PX_CAT_G1V2.csv` from ERP.  
### Customer Data (CRM source)
| cst_id | cst_key | cst_firstname | cst_lastname | cst_marital_status | cst_gndr | cst_create_date |
|---|---|---|---|---|---|---|
| 11000 | AW00011000 | Jon | Yang | M | M | 2025-10-06 |
### Product Data (CRM source)
| prd_id | prd_key | prd_nm | prd_cost | prd_line | prd_start_dt | prd_end_dt |
|---|---|---|---|---|---|---|
| 213 | AC-HE-HL-U509-R | Sport-100 Helmet- Red | 14 | S | 2012-07-01 | 2008-12-27 |
### Sales Data (CRM source)
| sls_ord_num | sls_prd_key | sls_cust_id | sls_order_dt | sls_ship_dt | sls_due_dt | sls_sales | sls_quantity | sls_price |
|---|---|---|---|---|---|---|---|---|
| SO43697 | BK-R93R-62 | 21768 | 20101229 | 20110105 | 20110110 | 3578 | 1 | 3578 |
### Customer Details Data (ERP source)
| CID | BDATE | GEN |
|---|---|---|
| NASAW00011000 | 1971-10-06 | Male |
### Customer Location Data (ERP source)
| CID | CNTRY |
|---|---|
| AW-00011000 | Australia |
### Product Category Data (ERP source)
| ID | CAT | SUBCAT | MAINTENANCE |
|---|---|---|---|
| AC_BR | Accessories | Bike Racks | Yes |


## 2. Bronze Layer - Extract and Load

## 3. Silver Layer - Transformations

## 4. Gold Layer - Dimensional Modelling

## 5. Power BI Analytics

Here is a diagram representing the data architecture:

![Architecture](/images/Architecture.png)

## View the code on GitHub

🔗 **[GitHub Repository](https://github.com/K-Usman/PostgreSQL-Data-Warehouse-with-Medallion-Architecture)**

Here is the Power BI Dashboard created based on star schema answering basic analytics questions:
![BI Report](/images/report.png)
