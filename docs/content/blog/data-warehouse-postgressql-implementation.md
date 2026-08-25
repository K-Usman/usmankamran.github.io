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
### Bronze Layer — Table Creation
The following DDL is used to create the customer table in the Bronze layer. The other Bronze-layer tables are created in a similar way.    
```sql
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
### Bronze Layer - Ingest Data  
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
Once we have the bronze layer ready, we will create silver layer tables and specify necessary transformations, data standardizations in the stored procedure pipeline. In this pipeline, the data types and column names will be descriptive and are based on our transformations. For example: silver.products has two attributes product_category and product_sales_key that is the split of 
prd_key in bronze.crm_prd_info. These two attributes will be used in the join to get category and sales information.  
### Silver Layer - Table Creation  
We will specify silver layer schemata with few additional columns for example valid_to, valid_from and is_current fields in the customer table that will used for implementing SCD type 2 and creating an index on `customer_id` to prevent duplication and make sure only one customer is active in case of dimension change.  
```sql
DROP TABLE IF EXISTS silver.customer;
CREATE TABLE silver.customer(
	customer_sk BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
	customer_id INT NOT NULL,
	customer_key varchar(30) NOT NULL,
	first_name TEXT,
	last_name TEXT,
	marital_status TEXT,
	gender TEXT,
	valid_from DATE NOT NULL DEFAULT '1900-01-01',
	valid_to DATE NOT NULL DEFAULT '9999-12-31',
	is_current BOOLEAN NOT NULL DEFAULT TRUE,
	source_load_date DATE NOT NULL
);
CREATE UNIQUE INDEX idx_customer_current
ON silver.customer(customer_id)
where is_current is TRUE;
```
### Silver Layer - Transform Data  
We will do following transformations and data standardizations.  
    - Implementation of SCD Type 2 on customer and customer location tables.
	- Standardization for country, dates etc columns.
	- Null Handling.
	- Data Enrichment. 
```sql
DROP PROCEDURE IF EXISTS silver.load_silver;
CREATE PROCEDURE silver.load_silver()
LANGUAGE plpgsql
AS $$
DECLARE
	v_start_time TIMESTAMP;
	v_end_time TIMESTAMP;
BEGIN
		v_start_time := LOCALTIMESTAMP;
		RAISE NOTICE 'Starting loading into silver layer at: %',v_start_time;
		RAISE NOTICE '========================================================';
		RAISE NOTICE 'Started transforming customer data..';
		-- Transformations on customer data and loading in silver layer.
		CREATE TEMP TABLE stg_customer ON COMMIT DROP AS
		Select DISTINCT ON (cst_id) cst_id,
		cst_key,
		TRIM(cst_firstname) AS cst_firstname,
		TRIM(cst_lastname) AS cst_lastname,
		CASE WHEN TRIM(cst_marital_status)='S' THEN 'Single' 
			 WHEN TRIM(cst_marital_status)= 'M' THEN 'Married' 
			 ELSE 'Unknown' END AS cst_marital_status,
		CASE WHEN TRIM(cst_gndr)='F' THEN 'Female'
			 WHEN TRIM(cst_gndr)='M' THEN 'Male'
			 ELSE NULLIF(initcap(TRIM(cst_gndr)),'')
			 END AS cst_gndr,
		_load_date
		FROM bronze.crm_cust_info
		WHERE cst_id is not null
		ORDER BY cst_id,_load_date DESC;
		
		/*
		1. SCD Type 2 logic: Compares source table to the customer data in destination(silver.customer) table, if a dimension i.e first_name,last_name, 
		marital_status for a customer id is changed, it will deactivate that record and insert the updated attribute.
		*/
		UPDATE silver.customer t
		SET valid_to = stg._load_date, is_current = FALSE
		FROM stg_customer stg
		WHERE t.customer_id = stg.cst_id
		  AND t.is_current = TRUE
		  AND (
		    t.first_name     IS DISTINCT FROM stg.cst_firstname OR
		    t.last_name      IS DISTINCT FROM stg.cst_lastname OR
		    t.marital_status IS DISTINCT FROM stg.cst_marital_status
		);
		-- Insert new or update customer record
		RAISE NOTICE 'Inserting transformed customer data into silver layer';
		INSERT INTO silver.customer (
		    customer_id, customer_key, first_name, last_name, 
		    marital_status, gender,source_load_date
		)
		SELECT 
		    stg.cst_id, stg.cst_key, stg.cst_firstname, stg.cst_lastname, 
		    stg.cst_marital_status, stg.cst_gndr,stg._load_date
		FROM stg_customer stg
		LEFT JOIN silver.customer t
		  ON stg.cst_id = t.customer_id
		 AND t.is_current = TRUE
		WHERE t.customer_id IS NULL;
		RAISE NOTICE 'Inserted customer data into silver.customer';
		RAISE NOTICE '========================================================';
		-- Customer transformations ends here
        ...
        ...
        ...
```  
## 4. Gold Layer - Dimensional Modelling

## 5. Power BI Analytics

Here is a diagram representing the data architecture:

![Architecture](/images/Architecture.png)

## View the code on GitHub

🔗 **[GitHub Repository](https://github.com/K-Usman/PostgreSQL-Data-Warehouse-with-Medallion-Architecture)**

Here is the Power BI Dashboard created based on star schema answering basic analytics questions:
![BI Report](/images/report.png)
