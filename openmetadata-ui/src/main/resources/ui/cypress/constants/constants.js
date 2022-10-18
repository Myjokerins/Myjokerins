/*
 *  Copyright 2021 Collate
 *  Licensed under the Apache License, Version 2.0 (the "License");
 *  you may not use this file except in compliance with the License.
 *  You may obtain a copy of the License at
 *  http://www.apache.org/licenses/LICENSE-2.0
 *  Unless required by applicable law or agreed to in writing, software
 *  distributed under the License is distributed on an "AS IS" BASIS,
 *  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *  See the License for the specific language governing permissions and
 *  limitations under the License.
 */

export const uuid = () => Cypress._.random(0, 1e6);
const id = uuid();

export const MYDATA_SUMMARY_OPTIONS = {
  tables: 'tables',
  topics: 'topics',
  dashboards: 'dashboards',
  pipelines: 'pipelines',
  service: 'service',
  user: 'user',
  terms: 'terms',
  mlmodels: 'mlmodels',
};

export const SEARCH_INDEX = {
  tables: 'table_search_index',
  topics: 'topic_search_index',
  dashboards: 'dashboard_search_index',
  pipelines: 'pipeline_search_index',
  mlmodels: 'mlmodel_search_index',
};

export const DATA_QUALITY_SAMPLE_DATA_TABLE = {
  term: 'dim_address',
  entity: MYDATA_SUMMARY_OPTIONS.tables,
  serviceName: 'sample_data',
  testCaseName: 'column_value_max_to_be_between',
};

export const SEARCH_ENTITY_TABLE = {
  table_1: {
    term: 'raw_customer',
    entity: MYDATA_SUMMARY_OPTIONS.tables,
    serviceName: 'sample_data',
  },
  table_2: {
    term: 'fact_session',
    entity: MYDATA_SUMMARY_OPTIONS.tables,
    serviceName: 'sample_data',
  },
  table_3: {
    term: 'raw_product_catalog',
    entity: MYDATA_SUMMARY_OPTIONS.tables,
    serviceName: 'sample_data',
  },
};

export const SEARCH_ENTITY_TOPIC = {
  topic_1: {
    term: 'shop_products',
    entity: MYDATA_SUMMARY_OPTIONS.topics,
    serviceName: 'sample_kafka',
  },
  topic_2: {
    term: 'orders',
    entity: MYDATA_SUMMARY_OPTIONS.topics,
    serviceName: 'sample_kafka',
  },
};

export const SEARCH_ENTITY_DASHBOARD = {
  dashboard_1: {
    term: 'Slack Dashboard',
    entity: MYDATA_SUMMARY_OPTIONS.dashboards,
    serviceName: 'sample_superset',
  },
  dashboard_2: {
    term: 'Unicode Test',
    entity: MYDATA_SUMMARY_OPTIONS.dashboards,
    serviceName: 'sample_superset',
  },
};
// Note:- Please do not change term name of pipeline
export const SEARCH_ENTITY_PIPELINE = {
  pipeline_1: {
    term: 'dim_product_etl',
    entity: MYDATA_SUMMARY_OPTIONS.pipelines,
    serviceName: 'sample_airflow',
  },
  pipeline_2: {
    term: 'dim_location_etl',
    entity: MYDATA_SUMMARY_OPTIONS.pipelines,
    serviceName: 'sample_airflow',
  },
};
export const SEARCH_ENTITY_MLMODEL = {
  mlmodel_1: {
    term: 'forecast_sales',
    entity: MYDATA_SUMMARY_OPTIONS.mlmodels,
    serviceName: 'mlflow_svc',
  },
  mlmodel_2: {
    term: 'eta_predictions',
    entity: MYDATA_SUMMARY_OPTIONS.mlmodels,
    serviceName: 'mlflow_svc',
  },
};

export const DELETE_ENTITY = {
  table: {
    term: 'fact_sale',
    entity: MYDATA_SUMMARY_OPTIONS.tables,
    serviceName: 'sample_data',
  },
  topic: {
    term: 'shop_updates',
    entity: MYDATA_SUMMARY_OPTIONS.topics,
    serviceName: 'sample_kafka',
  },
};

export const RECENT_SEARCH_TITLE = 'Recent Search Terms';
export const RECENT_VIEW_TITLE = 'Recent Views';
export const MY_DATA_TITLE = 'My Data';
export const FOLLOWING_TITLE = 'Following';
export const TEAM_ENTITY = 'team_entity';

export const NO_SEARCHED_TERMS = 'No searched terms';
export const DELETE_TERM = 'DELETE';

export const TOTAL_SAMPLE_DATA_TEAMS_COUNT = 7;
export const TEAMS = {
  Cloud_Infra: { name: 'Cloud_Infra', users: 15 },
  Customer_Support: { name: 'Customer_Support', users: 20 },
  Data_Platform: { name: 'Data_Platform', users: 16 },
};

export const NEW_TEST_SUITE = {
  name: `mysql_matrix`,
  description: 'mysql critical matrix',
};

export const NEW_TABLE_TEST_CASE = {
  type: 'tableColumnNameToExist',
  field: 'id',
  description: 'New table test case for TableColumnNameToExist',
};

export const NEW_COLUMN_TEST_CASE = {
  column: 'id',
  type: 'columnValueLengthsToBeBetween',
  min: 3,
  max: 6,
  description: 'New table test case for columnValueLengthsToBeBetween',
};

export const NEW_TEAM = {
  team_1: {
    name: 'account',
    display_name: 'Account',
    description: 'Account department',
  },
  team_2: {
    name: 'service',
    display_name: 'Service',
    description: 'Service department',
  },
};

export const NEW_USER = {
  email: `test_${id}@gmail.com`,
  display_name: `Test user ${id}`,
  description: 'Hello, I am test user',
};

export const NEW_ADMIN = {
  email: `test_${id}@gmail.com`,
  display_name: `Test admin ${id}`,
  description: 'Hello, I am test admin',
};

export const NEW_TAG_CATEGORY = {
  name: 'TestCategory',
  description: 'This is the TestCategory',
};
export const NEW_TAG = {
  name: 'test',
  description: 'This is the Test tag',
};

export const NEW_GLOSSARY = {
  name: 'Business Glossary',
  description: 'This is the Business glossary',
};
export const NEW_GLOSSARY_TERMS = {
  term_1: {
    name: 'Purchase',
    description: 'This is the Purchase',
    synonyms: 'buy,collect,acquire',
  },
  term_2: {
    name: 'Sales',
    description: 'This is the Sales',
    synonyms: 'give,disposal,deal',
  },
};

export const service = {
  name: 'Glue',
  description: 'This is a Glue service',
  newDescription: 'This is updated Glue service description',
  Owner: 'Aaron Johnson',
};

export const SERVICE_TYPE = {
  Database: 'Database',
  Messaging: 'Messaging',
  Dashboard: 'Dashboard',
  Pipelines: 'Pipelines',
  MLModels: 'ML Models',
};

export const ENTITIES = {
  entity_table: {
    name: 'table',
    description: 'This is Table custom property',
    integerValue: '45',
    stringValue: 'This is string propery',
    markdownValue: 'This is markdown value',
    entityObj: SEARCH_ENTITY_TABLE.table_1,
  },
  entity_topic: {
    name: 'topic',
    description: 'This is Topic custom property',
    integerValue: '23',
    stringValue: 'This is string propery',
    markdownValue: 'This is markdown value',
    entityObj: SEARCH_ENTITY_TOPIC.topic_1,
  },
  entity_dashboard: {
    name: 'dashboard',
    description: 'This is Dashboard custom property',
    integerValue: '14',
    stringValue: 'This is string propery',
    markdownValue: 'This is markdown value',
    entityObj: SEARCH_ENTITY_DASHBOARD.dashboard_1,
  },
  entity_pipeline: {
    name: 'pipeline',
    description: 'This is Pipeline custom property',
    integerValue: '78',
    stringValue: 'This is string propery',
    markdownValue: 'This is markdown value',
    entityObj: SEARCH_ENTITY_PIPELINE.pipeline_1,
  },
};

export const LOGIN = {
  username: 'admin@openmetadata.org',
  password: 'admin',
};

export const ANNOUNCEMENT_ENTITIES = [SEARCH_ENTITY_TABLE.table_1, SEARCH_ENTITY_TOPIC.topic_1, SEARCH_ENTITY_DASHBOARD.dashboard_1, SEARCH_ENTITY_PIPELINE.pipeline_1]

export const HTTP_CONFIG_SOURCE = {
  DBT_CATALOG_HTTP_PATH:
    'https://raw.githubusercontent.com/OnkarVO7/dbt_git_test/master/catalog.json',
  DBT_MANIFEST_HTTP_PATH:
    'https://raw.githubusercontent.com/OnkarVO7/dbt_git_test/master/manifest.json',
  DBT_RUN_RESTLTS_FILE_PATH:
    'https://raw.githubusercontent.com/OnkarVO7/dbt_git_test/master/run_results.json',
};

export const DBT = {
  tagCategory: 'DBTTags',
  tagName: 'model_tag_one',
  dbtQuery: 'select * from "dev"."dbt_jaffle"."stg_orders"',
  dbtLineageNode1: 'dev.dbt_jaffle.stg_orders',
  dbtLineageNode2: 'dev.dbt_jaffle.stg_payments',
  dataQualityTest1: 'dbt_utils_equal_rowcount_customers_ref_orders_',
  dataQualityTest2: 'not_null_customers_customer_id',
};
