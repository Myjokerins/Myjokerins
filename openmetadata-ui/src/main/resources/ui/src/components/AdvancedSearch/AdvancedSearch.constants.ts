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

import { uniq } from 'lodash';
import {
  BasicConfig,
  Fields,
  JsonTree,
  SelectFieldSettings,
  Utils as QbUtils,
} from 'react-awesome-query-builder';
import AntdConfig from 'react-awesome-query-builder/lib/config/antd';
import { suggestQuery } from '../../axiosAPIs/searchAPI';
import { SuggestionField } from '../../enums/AdvancedSearch.enum';
import { SearchIndex } from '../../enums/search.enum';

const BaseConfig = AntdConfig as BasicConfig;

/**
 * Generates a query builder tree with a group containing an empty rule
 */
export const emptyJsonTree: JsonTree = {
  id: QbUtils.uuid(),
  type: 'group',
  children1: {
    [QbUtils.uuid()]: {
      type: 'rule',
      properties: {
        field: null,
        operator: null,
        value: [],
        valueSrc: [],
      },
    },
  },
};

/**
 * Create an autocomplete function using elasctisearch's suggestion API
 * @param searchIndex Index to search
 * @param suggestField `suggest_` field to use
 */
export const autocomplete: (
  searchIndex: SearchIndex | SearchIndex[],
  suggestField?: SuggestionField
) => SelectFieldSettings['asyncFetch'] =
  (searchIndex, suggestField) => (search) =>
    suggestQuery({
      query: search ?? '*',
      searchIndex: searchIndex,
      field: suggestField,
      fetchSource: false,
    }).then((resp) => ({
      values: uniq(resp).map(({ text }) => ({ value: text, title: text })),
      hasMore: false,
    }));

/**
 * Common fields that exit for all searchable entities
 */
const commonQueryBuilderFields: Fields = {
  deleted: {
    label: 'Deleted',
    type: 'boolean',
    defaultValue: true,
  },

  owner: {
    label: 'Owner',
    type: '!struct',
    subfields: {
      name: {
        label: 'username',
        type: 'select',
        fieldSettings: {
          asyncFetch: autocomplete([SearchIndex.USER, SearchIndex.TEAM]),
        },
      },
      displayName: {
        label: 'name',
        type: 'text',
      },
      type: {
        label: 'type',
        type: 'select',
        fieldSettings: {
          listValues: [
            { value: 'user', title: 'User' },
            { value: 'team', title: 'Team' },
          ],
        },
      },
    },
  },

  'tags.tagFQN': {
    label: 'Tags',
    type: 'select',
    fieldSettings: {
      asyncFetch: autocomplete([SearchIndex.TAG, SearchIndex.GLOSSARY]),
    },
  },

  'tier.tagFQN': {
    label: 'Tier',
    type: 'select',
    fieldSettings: {
      asyncFetch: autocomplete([SearchIndex.TAG, SearchIndex.GLOSSARY]),
    },
  },
};

/**
 * Fields specific to services
 */
const serviceQueryBuilderFields: Fields = {
  service: {
    label: 'Service',
    type: '!struct',
    subfields: {
      name: {
        label: 'name',
        type: 'select',
        fieldSettings: {
          asyncFetch: autocomplete(SearchIndex.TABLE, SuggestionField.SERVICE),
        },
      },
      deleted: {
        label: 'deleted',
        type: 'boolean',
        defaultValue: true,
      },
    },
  },
};

/**
 * Fields specific to tables
 */
const tableQueryBuilderFields: Fields = {
  database: {
    label: 'Database',
    type: '!struct',
    subfields: {
      name: {
        label: 'name',
        type: 'select',
        fieldSettings: {
          asyncFetch: autocomplete(SearchIndex.TABLE, SuggestionField.DATABASE),
        },
      },
      deleted: {
        label: 'deleted',
        type: 'boolean',
        defaultValue: true,
      },
    },
  },

  databaseSchema: {
    label: 'Database Schema',
    type: '!struct',
    subfields: {
      name: {
        label: 'name',
        type: 'select',
        fieldSettings: {
          asyncFetch: autocomplete(SearchIndex.TABLE, SuggestionField.SCHEMA),
        },
      },
      deleted: {
        label: 'deleted',
        type: 'boolean',
        defaultValue: true,
      },
    },
  },

  name: {
    label: 'Table',
    type: 'select',
    fieldSettings: {
      asyncFetch: autocomplete(SearchIndex.TABLE, SuggestionField.ROOT),
    },
  },

  columns: {
    label: 'Column',
    type: '!struct',
    subfields: {
      name: {
        label: 'name',
        type: 'select',
        fieldSettings: {
          asyncFetch: autocomplete(SearchIndex.TABLE, SuggestionField.COLUMN),
        },
      },
      dataType: {
        label: 'data type',
        type: 'text',
      },
      constraint: {
        label: 'constraint',
        type: 'text',
      },
    },
  },
};

/**
 * Overriding default configurations.
 * Basic attributes that fields inherit from.
 */
const initialConfigWithoutFields: BasicConfig = {
  ...BaseConfig,
  types: {
    ...BaseConfig.types,
    multiselect: {
      ...BaseConfig.types.multiselect,
      widgets: {
        ...BaseConfig.types.multiselect.widgets,
        // Adds the "Contains" and "Not contains" options for fields with type multiselect
        text: {
          operators: ['like', 'not_like'],
        },
      },
      // Removes NULL check operators
      excludeOperators: ['is_null', 'is_not_null'],
      // Limits source to user input values, not other fields
      valueSources: ['value'],
    },
    select: {
      ...BaseConfig.types.select,
      widgets: {
        ...BaseConfig.types.select.widgets,
        text: {
          operators: ['like', 'not_like'],
        },
      },
      excludeOperators: ['is_null', 'is_not_null'],
      valueSources: ['value'],
    },
    text: {
      ...BaseConfig.types.text,
      valueSources: ['value'],
    },
  },
  widgets: {
    ...BaseConfig.widgets,
    multiselect: {
      ...BaseConfig.widgets.multiselect,
      showSearch: true,
      showCheckboxes: true,
      useAsyncSearch: true,
      useLoadMore: false,
    },
    select: {
      ...BaseConfig.widgets.select,
      showSearch: true,
      showCheckboxes: true,
      useAsyncSearch: true,
      useLoadMore: false,
    },
    text: {
      ...BaseConfig.widgets.text,
    },
  },
  operators: {
    ...BaseConfig.operators,
    like: {
      ...BaseConfig.operators.like,
      elasticSearchQueryType: 'wildcard',
    },
  },
};

/**
 * Builds search index specific configuration for the query builder
 */
export const getQbConfigs: (searchIndex: SearchIndex) => BasicConfig = (
  searchIndex
) => {
  switch (searchIndex) {
    case SearchIndex.MLMODEL:
      return {
        ...initialConfigWithoutFields,
        fields: {
          ...commonQueryBuilderFields,
          ...serviceQueryBuilderFields,
        },
      };

    case SearchIndex.PIPELINE:
      return {
        ...initialConfigWithoutFields,
        fields: {
          ...commonQueryBuilderFields,
          ...serviceQueryBuilderFields,
        },
      };

    case SearchIndex.DASHBOARD:
      return {
        ...initialConfigWithoutFields,
        fields: {
          ...commonQueryBuilderFields,
          ...serviceQueryBuilderFields,
        },
      };

    case SearchIndex.TABLE:
      return {
        ...initialConfigWithoutFields,
        fields: {
          ...commonQueryBuilderFields,
          ...serviceQueryBuilderFields,
          ...tableQueryBuilderFields,
        },
      };

    case SearchIndex.TOPIC:
      return {
        ...initialConfigWithoutFields,
        fields: {
          ...commonQueryBuilderFields,
          ...serviceQueryBuilderFields,
        },
      };

    default:
      return {
        ...initialConfigWithoutFields,
        fields: {
          ...commonQueryBuilderFields,
        },
      };
  }
};
