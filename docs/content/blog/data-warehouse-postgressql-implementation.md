---
title: Data Warehouse and Star Schema Implementation with PostgreSQL using Medallion Architecture
date: 2026-08-25
description: Built an end-to-end data warehouse in PostgreSQL using Medallion architecture (Bronze → Silver → Gold), implementing Slowly Changing Dimension Type 2 (SCD2) to track historical changes and a star schema for analytics-ready reporting in Power BI.
---
In this project I will implement a complete data warehouse solution using Medallion Architecture including star schema and Slowly Changing Dimension Type 2 and a simple dashboard using Power BI.

## 1. Explore Source Data

We have data coming from two source systems: **CRM** and **ERP**. The source data is available as CSV files on my local machine.

The source CSV files are `cust_info.csv`, `prd_info.csv`, and `sales_details.csv` from CRM, and `CUST_AZ12.csv`, `LOC_A101.csv`, and `PX_CAT_G1V2.csv` from ERP.

### Customer Data (CRM Source)

We have the following source data for customers:

| cst_id | cst_key | cst_firstname | cst_lastname | cst_marital_status | cst_gndr | cst_create_date |
|---|---|---|---|---|---|---|
| 11000 | AW00011000 | Jon | Yang | M | M | 2025-10-06 |

Similar schemas are available for the **product** and **sales** data in the CRM source, as well as the **customer**, **location**, and **product category** data in the ERP source.

## 2. Bronze Layer - Extract and Load
After getting to know source data and the schemata. We will specify the similar tables definitions in the bronze layer and create tables in the data warehouse. Bronze layer is our staging layer and will contain raw source data. Therefore, bronze layer tables will be same as our source csv files.  
DDL for customer table. Other tables in bronze layer will be created in similar way.
`` sql
CREATE TABLE bronze.crm_cust_info(
	cst_id INT,
	cst_key varchar(50),
	cst_firstname varchar(50),
	cst_lastname varchar(50),
	cst_marital_status varchar(50),
	cst_gndr varchar(50),
	cst_create_date DATE,
	_load_date DATE DEFAULT CURRENT_DATE
);
```  
After creating bronze layer schema, we will load data into these tables from the CSV files using PostgresSQL `COPY` command. I have written a stored procedure that will dump CSV data into bronze layer tables.  
Note: In order to use COPY command, I have placed my csv files in the temp directory so Postgres server can access it because COPY command runs on the server side.  
```sql
DROP PROCEDURE IF EXISTS bronze.load_bronze;
CREATE PROCEDURE bronze.load_bronze()
LANGUAGE plpgsql
AS $$
DECLARE
	v_start_time TIMESTAMP;
    v_end_time TIMESTAMP;
    v_rows_loaded INT;
BEGIN
	v_start_time := LOCALTIMESTAMP;
	-- Loading bronze layer
	RAISE NOTICE 'Starting bronze layer loading at %',v_start_time;
	
	-- Loading customer data from CRM source
	RAISE NOTICE 'Loading customer info data..';
	TRUNCATE TABLE bronze.crm_cust_info RESTART IDENTITY;
	COPY bronze.crm_cust_info(
		cst_id,
		cst_key,
		cst_firstname,
		cst_lastname,
		cst_marital_status,
		cst_gndr,
		cst_create_date
	)
	FROM 'C:/tmp/data/source_crm/cust_info.csv'
	With(
		FORMAT CSV,
		HEADER TRUE,
		DELIMITER ','
	);
	RAISE NOTICE 'FINISHED LOADING RAW CUSTOMER DATA';
	Select Count(*) into v_rows_loaded from bronze.crm_cust_info;
	RAISE NOTICE 'Total rows loaded: %',v_rows_loaded;
    ...
    ...
    ...
```
## 3. Silver Layer - Transformations

## 4. Gold Layer - Dimensional Modelling

## 5. Power BI Analytics

Here is a diagram representing the data architecture:

![Architecture](/images/Architecture.png)

## View the code on GitHub

🔗 **[GitHub Repository](https://github.com/K-Usman/PostgreSQL-Data-Warehouse-with-Medallion-Architecture)**

Here is the Power BI Dashboard created based on star schema answering basic analytics questions:
![BI Report](/images/report.png)
