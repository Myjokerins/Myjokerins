/* eslint-disable max-len */
export const MOCK_LINEAGE_DATA = {
  entity: {
    id: 'f80de28c-ecce-46fb-88c7-152cc111f9ec',
    type: 'table',
    name: 'fact_session',
    fullyQualifiedName: 'sample_data.ecommerce_db.shopify.fact_session',
    description:
      'This fact table contains information about the visitors to your online store. This table has one row per session, where one session can contain many page views. If you use Urchin Traffic Module (UTM) parameters in marketing campaigns, then you can use this table to track how many customers they direct to your store.',
    deleted: false,
    href: 'http://localhost:8585/api/v1/tables/f80de28c-ecce-46fb-88c7-152cc111f9ec',
  },
  nodes: [
    {
      id: '5f2eee5d-1c08-4756-af31-dabce7cb26fd',
      type: 'table',
      name: 'dim_customer',
      fullyQualifiedName: 'sample_data.ecommerce_db.shopify.dim_customer',
      description:
        'The dimension table contains data about your customers. The customers table contains one row per customer. It includes historical metrics (such as the total amount that each customer has spent in your store) as well as forward-looking metrics (such as the predicted number of days between future orders and the expected order value in the next 30 days). This table also includes columns that segment customers into various categories (such as new, returning, promising, at risk, dormant, and loyal), which you can use to target marketing activities.',
      deleted: false,
      href: 'http://localhost:8585/api/v1/tables/5f2eee5d-1c08-4756-af31-dabce7cb26fd',
    },
    {
      id: '92d7cb90-cc49-497a-9b01-18f4c6a61951',
      type: 'table',
      name: 'storage_service_entity',
      fullyQualifiedName:
        'mysql.default.openmetadata_db.storage_service_entity',
      deleted: false,
      href: 'http://localhost:8585/api/v1/tables/92d7cb90-cc49-497a-9b01-18f4c6a61951',
    },
    {
      id: '2d30f754-05de-4372-af27-f221997bfe9a',
      type: 'table',
      name: 'dim_address',
      fullyQualifiedName: 'sample_data.ecommerce_db.shopify.dim_address',
      description:
        'This dimension table contains the billing and shipping addresses of customers. You can join this table with the sales table to generate lists of the billing and shipping addresses. Customers can enter their addresses more than once, so the same address can appear in more than one row in this table. This table contains one row per customer address.',
      deleted: false,
      href: 'http://localhost:8585/api/v1/tables/2d30f754-05de-4372-af27-f221997bfe9a',
    },
    {
      id: 'b5d520fd-a4a5-4173-85d5-f804ddab452a',
      type: 'table',
      name: 'dashboard_service_entity',
      fullyQualifiedName:
        'mysql.default.openmetadata_db.dashboard_service_entity',
      deleted: false,
      href: 'http://localhost:8585/api/v1/tables/b5d520fd-a4a5-4173-85d5-f804ddab452a',
    },
    {
      id: 'bf99a241-76e9-4947-86a7-c9bf3c326974',
      type: 'table',
      name: 'dim.product',
      fullyQualifiedName: 'sample_data.ecommerce_db.shopify."dim.product"',
      description:
        'This dimension table contains information about each of the products in your store. This table contains one row per product. This table reflects the current state of products in your Shopify admin.',
      deleted: false,
      href: 'http://localhost:8585/api/v1/tables/bf99a241-76e9-4947-86a7-c9bf3c326974',
    },
    {
      id: 'd4aab894-5877-44f1-840c-b08a2dc664a4',
      type: 'pipeline',
      name: 'dim_address_etl',
      fullyQualifiedName: 'sample_airflow.dim_address_etl',
      description: 'dim_address ETL pipeline',
      displayName: 'dim_address etl',
      deleted: false,
      href: 'http://localhost:8585/api/v1/pipelines/d4aab894-5877-44f1-840c-b08a2dc664a4',
    },
    {
      id: '5a51ea54-8304-4fa8-a7b2-1f083ff1580c',
      type: 'pipeline',
      name: 'presto_etl',
      fullyQualifiedName: 'sample_airflow.presto_etl',
      description: 'Presto ETL pipeline',
      displayName: 'Presto ETL',
      deleted: false,
      href: 'http://localhost:8585/api/v1/pipelines/5a51ea54-8304-4fa8-a7b2-1f083ff1580c',
    },
  ],
  upstreamEdges: [
    {
      fromEntity: '2d30f754-05de-4372-af27-f221997bfe9a',
      toEntity: '5f2eee5d-1c08-4756-af31-dabce7cb26fd',
      lineageDetails: {
        sqlQuery: '',
        columnsLineage: [
          {
            fromColumns: [
              'sample_data.ecommerce_db.shopify.dim_address.address_id',
            ],
            toColumn:
              'sample_data.ecommerce_db.shopify.dim_customer.total_order_value',
          },
        ],
      },
    },
    {
      fromEntity: '5f2eee5d-1c08-4756-af31-dabce7cb26fd',
      toEntity: 'f80de28c-ecce-46fb-88c7-152cc111f9ec',
      lineageDetails: {
        sqlQuery: '',
        columnsLineage: [
          {
            fromColumns: [
              'sample_data.ecommerce_db.shopify.dim_customer.customer_id',
            ],
            toColumn:
              'sample_data.ecommerce_db.shopify.fact_session.derived_session_token',
          },
        ],
      },
    },
    {
      fromEntity: '92d7cb90-cc49-497a-9b01-18f4c6a61951',
      toEntity: 'f80de28c-ecce-46fb-88c7-152cc111f9ec',
    },
    {
      fromEntity: 'b5d520fd-a4a5-4173-85d5-f804ddab452a',
      toEntity: '2d30f754-05de-4372-af27-f221997bfe9a',
      lineageDetails: {
        sqlQuery: '',
        columnsLineage: [
          {
            fromColumns: [
              'mysql.default.openmetadata_db.dashboard_service_entity.id',
            ],
            toColumn: 'sample_data.ecommerce_db.shopify.dim_address.shop_id',
          },
        ],
      },
    },
    {
      fromEntity: 'bf99a241-76e9-4947-86a7-c9bf3c326974',
      toEntity: '2d30f754-05de-4372-af27-f221997bfe9a',
      lineageDetails: {
        sqlQuery: '',
        columnsLineage: [
          {
            fromColumns: [
              'sample_data.ecommerce_db.shopify."dim.product".shop_id',
            ],
            toColumn: 'sample_data.ecommerce_db.shopify.dim_address.first_name',
          },
        ],
      },
    },
    {
      fromEntity: 'd4aab894-5877-44f1-840c-b08a2dc664a4',
      toEntity: '2d30f754-05de-4372-af27-f221997bfe9a',
    },
    {
      fromEntity: '5a51ea54-8304-4fa8-a7b2-1f083ff1580c',
      toEntity: '92d7cb90-cc49-497a-9b01-18f4c6a61951',
    },
  ],
  downstreamEdges: [
    {
      toEntity: '92d7cb90-cc49-497a-9b01-18f4c6a61951',
      fromEntity: 'f80de28c-ecce-46fb-88c7-152cc111f9ec',
    },
  ],
};
export const SELECTED_EDGE = {
  id: 'column-sample_data.ecommerce_db.shopify.dim_customer.customer_id-sample_data.ecommerce_db.shopify.fact_session.derived_session_token-edge-5f2eee5d-1c08-4756-af31-dabce7cb26fd-f80de28c-ecce-46fb-88c7-152cc111f9ec',
  source: {
    id: '5f2eee5d-1c08-4756-af31-dabce7cb26fd',
    type: 'table',
    name: 'dim_customer',
    fullyQualifiedName: 'sample_data.ecommerce_db.shopify.dim_customer',
    description:
      'The dimension table contains data about your customers. The customers table contains one row per customer. It includes historical metrics (such as the total amount that each customer has spent in your store) as well as forward-looking metrics (such as the predicted number of days between future orders and the expected order value in the next 30 days). This table also includes columns that segment customers into various categories (such as new, returning, promising, at risk, dormant, and loyal), which you can use to target marketing activities.',
    deleted: false,
    href: 'http://localhost:8585/api/v1/tables/5f2eee5d-1c08-4756-af31-dabce7cb26fd',
  },
  target: {
    id: 'f80de28c-ecce-46fb-88c7-152cc111f9ec',
    type: 'table',
    name: 'fact_session',
    fullyQualifiedName: 'sample_data.ecommerce_db.shopify.fact_session',
    description:
      'This fact table contains information about the visitors to your online store. This table has one row per session, where one session can contain many page views. If you use Urchin Traffic Module (UTM) parameters in marketing campaigns, then you can use this table to track how many customers they direct to your store.',
    deleted: false,
    href: 'http://localhost:8585/api/v1/tables/f80de28c-ecce-46fb-88c7-152cc111f9ec',
  },
  data: {
    id: 'column-sample_data.ecommerce_db.shopify.dim_customer.customer_id-sample_data.ecommerce_db.shopify.fact_session.derived_session_token-edge-5f2eee5d-1c08-4756-af31-dabce7cb26fd-f80de28c-ecce-46fb-88c7-152cc111f9ec',
    source: '5f2eee5d-1c08-4756-af31-dabce7cb26fd',
    target: 'f80de28c-ecce-46fb-88c7-152cc111f9ec',
    targetHandle:
      'sample_data.ecommerce_db.shopify.fact_session.derived_session_token',
    sourceHandle: 'sample_data.ecommerce_db.shopify.dim_customer.customer_id',
    isColumnLineage: true,
  },
};
export const UP_STREAM_EDGE = {
  fromEntity: '5f2eee5d-1c08-4756-af31-dabce7cb26fd',
  toEntity: 'f80de28c-ecce-46fb-88c7-152cc111f9ec',
  lineageDetails: {
    sqlQuery: '',
    columnsLineage: [
      {
        fromColumns: [
          'sample_data.ecommerce_db.shopify.dim_customer.customer_id',
        ],
        toColumn:
          'sample_data.ecommerce_db.shopify.fact_session.derived_session_token',
      },
    ],
  },
};

export const COLUMN_LINEAGE_DETAILS = {
  sqlQuery: '',
  columnsLineage: [
    {
      fromColumns: ['sample_data.ecommerce_db.shopify.dim_address.address_id'],
      toColumn:
        'sample_data.ecommerce_db.shopify.dim_customer.total_order_value',
    },
  ],
};

export const UPDATED_LINEAGE_EDGE = [
  {
    fromEntity: '2d30f754-05de-4372-af27-f221997bfe9a',
    lineageDetails: {
      columnsLineage: [
        {
          fromColumns: [
            'sample_data.ecommerce_db.shopify.dim_address.address_id',
          ],
          toColumn:
            'sample_data.ecommerce_db.shopify.dim_customer.total_order_value',
        },
      ],
      sqlQuery: '',
    },
    toEntity: '5f2eee5d-1c08-4756-af31-dabce7cb26fd',
  },
  {
    fromEntity: '5f2eee5d-1c08-4756-af31-dabce7cb26fd',
    lineageDetails: {
      columnsLineage: [
        {
          fromColumns: [
            'sample_data.ecommerce_db.shopify.dim_address.address_id',
          ],
          toColumn:
            'sample_data.ecommerce_db.shopify.dim_customer.total_order_value',
        },
      ],
      sqlQuery: '',
    },
    toEntity: 'f80de28c-ecce-46fb-88c7-152cc111f9ec',
  },
  {
    fromEntity: '92d7cb90-cc49-497a-9b01-18f4c6a61951',
    toEntity: 'f80de28c-ecce-46fb-88c7-152cc111f9ec',
  },
  {
    fromEntity: 'b5d520fd-a4a5-4173-85d5-f804ddab452a',
    lineageDetails: {
      columnsLineage: [
        {
          fromColumns: [
            'mysql.default.openmetadata_db.dashboard_service_entity.id',
          ],
          toColumn: 'sample_data.ecommerce_db.shopify.dim_address.shop_id',
        },
      ],
      sqlQuery: '',
    },
    toEntity: '2d30f754-05de-4372-af27-f221997bfe9a',
  },
  {
    fromEntity: 'bf99a241-76e9-4947-86a7-c9bf3c326974',
    lineageDetails: {
      columnsLineage: [
        {
          fromColumns: [
            'sample_data.ecommerce_db.shopify."dim.product".shop_id',
          ],
          toColumn: 'sample_data.ecommerce_db.shopify.dim_address.first_name',
        },
      ],
      sqlQuery: '',
    },
    toEntity: '2d30f754-05de-4372-af27-f221997bfe9a',
  },
  {
    fromEntity: 'd4aab894-5877-44f1-840c-b08a2dc664a4',
    toEntity: '2d30f754-05de-4372-af27-f221997bfe9a',
  },
  {
    fromEntity: '5a51ea54-8304-4fa8-a7b2-1f083ff1580c',
    toEntity: '92d7cb90-cc49-497a-9b01-18f4c6a61951',
  },
];

export const EDGE_TO_BE_REMOVED = {
  id: 'edge-5a51ea54-8304-4fa8-a7b2-1f083ff1580c-92d7cb90-cc49-497a-9b01-18f4c6a61951',
  source: '5a51ea54-8304-4fa8-a7b2-1f083ff1580c',
  target: '92d7cb90-cc49-497a-9b01-18f4c6a61951',
  type: 'buttonedge',
  style: {
    strokeWidth: '2px',
  },
  markerEnd: {
    type: 'arrowclosed',
  },
  data: {
    id: 'edge-5a51ea54-8304-4fa8-a7b2-1f083ff1580c-92d7cb90-cc49-497a-9b01-18f4c6a61951',
    source: '5a51ea54-8304-4fa8-a7b2-1f083ff1580c',
    target: '92d7cb90-cc49-497a-9b01-18f4c6a61951',
    sourceType: 'pipeline',
    targetType: 'table',
    isColumnLineage: false,
  },
};

export const MOCK_REMOVED_NODE = {
  id: 'edge-5a51ea54-8304-4fa8-a7b2-1f083ff1580c-92d7cb90-cc49-497a-9b01-18f4c6a61951',
  source: {
    id: '5a51ea54-8304-4fa8-a7b2-1f083ff1580c',
    type: 'pipeline',
    name: 'presto_etl',
    fullyQualifiedName: 'sample_airflow.presto_etl',
    description: 'Presto ETL pipeline',
    displayName: 'Presto ETL',
    deleted: false,
    href: 'http://localhost:8585/api/v1/pipelines/5a51ea54-8304-4fa8-a7b2-1f083ff1580c',
  },
  target: {
    id: '92d7cb90-cc49-497a-9b01-18f4c6a61951',
    type: 'table',
    name: 'storage_service_entity',
    fullyQualifiedName: 'mysql.default.openmetadata_db.storage_service_entity',
    deleted: false,
    href: 'http://localhost:8585/api/v1/tables/92d7cb90-cc49-497a-9b01-18f4c6a61951',
  },
};

export const MOCK_PARAMS_FOR_UP_STREAM = {
  source: '5a51ea54-8304-4fa8-a7b2-1f083ff1580c',
  sourceHandle: null,
  target: '92d7cb90-cc49-497a-9b01-18f4c6a61951',
  targetHandle: null,
};

export const MOCK_PARAMS_FOR_DOWN_STREAM = {
  source: 'f80de28c-ecce-46fb-88c7-152cc111f9ec',
  sourceHandle: null,
  target: 'b32555fc-f38b-4e4b-9dbf-f156fa8ba3c9',
  targetHandle: null,
};

export const UPDATED_COLUMN_LINEAGE = {
  sqlQuery: '',
  columnsLineage: [
    {
      fromColumns: [
        'sample_data.ecommerce_db.shopify.dim_customer.customer_id',
      ],
      toColumn:
        'sample_data.ecommerce_db.shopify.fact_session.derived_session_token',
    },
    {
      fromColumns: ['sample_data.ecommerce_db.shopify.dim_customer.shop_id'],
      toColumn: 'sample_data.ecommerce_db.shopify.fact_session.shop_id',
    },
  ],
};

export const UPDATED_EDGE_PARAM = {
  source: '5f2eee5d-1c08-4756-af31-dabce7cb26fd',
  sourceHandle: 'sample_data.ecommerce_db.shopify.dim_customer.shop_id',
  target: 'f80de28c-ecce-46fb-88c7-152cc111f9ec',
  targetHandle: 'sample_data.ecommerce_db.shopify.fact_session.shop_id',
};

export const MOCK_COLUMN_LINEAGE_EDGE = {
  data: {
    id: 'column-sample_data.ecommerce_db.shopify.dim_customer.shop_id-sample_data.ecommerce_db.shopify.fact_session.shop_id-edge-5f2eee5d-1c08-4756-af31-dabce7cb26fd-f80de28c-ecce-46fb-88c7-152cc111f9ec',
    isColumnLineage: true,
    source: '5f2eee5d-1c08-4756-af31-dabce7cb26fd',
    sourceHandle: 'sample_data.ecommerce_db.shopify.dim_customer.shop_id',
    sourceType: 'table',
    target: 'f80de28c-ecce-46fb-88c7-152cc111f9ec',
    targetHandle: 'sample_data.ecommerce_db.shopify.fact_session.shop_id',
    targetType: 'table',
  },
  id: 'column-sample_data.ecommerce_db.shopify.dim_customer.shop_id-sample_data.ecommerce_db.shopify.fact_session.shop_id-edge-5f2eee5d-1c08-4756-af31-dabce7cb26fd-f80de28c-ecce-46fb-88c7-152cc111f9ec',
  markerEnd: { type: 'arrowclosed' },
  source: '5f2eee5d-1c08-4756-af31-dabce7cb26fd',
  sourceHandle: 'sample_data.ecommerce_db.shopify.dim_customer.shop_id',
  style: undefined,
  target: 'f80de28c-ecce-46fb-88c7-152cc111f9ec',
  targetHandle: 'sample_data.ecommerce_db.shopify.fact_session.shop_id',
  type: 'buttonedge',
};

export const MOCK_NORMAL_LINEAGE_EDGE = {
  id: 'edge-5f2eee5d-1c08-4756-af31-dabce7cb26fd-f80de28c-ecce-46fb-88c7-152cc111f9ec',
  source: '5f2eee5d-1c08-4756-af31-dabce7cb26fd',
  target: 'f80de28c-ecce-46fb-88c7-152cc111f9ec',
  type: 'buttonedge',
  style: { strokeWidth: '2px' },
  markerEnd: { type: 'arrowclosed' },
  data: {
    id: 'edge-5f2eee5d-1c08-4756-af31-dabce7cb26fd-f80de28c-ecce-46fb-88c7-152cc111f9ec',
    source: '5f2eee5d-1c08-4756-af31-dabce7cb26fd',
    target: 'f80de28c-ecce-46fb-88c7-152cc111f9ec',
    sourceType: 'table',
    targetType: 'table',
    isColumnLineage: false,
  },
};
