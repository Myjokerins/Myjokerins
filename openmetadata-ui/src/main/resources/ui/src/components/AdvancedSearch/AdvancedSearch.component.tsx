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

import React, { useEffect, useMemo, useState } from 'react';
import {
  Builder,
  Config,
  Query,
  Utils as QbUtils,
} from 'react-awesome-query-builder';
import { elasticSearchFormat } from '../../utils/QueryBuilderElasticsearchFormatUtils';
import { emptyJsonTree, getQbConfigs } from './AdvancedSearch.constants';
import { AdvancedSearchProps } from './AdvancedSearch.interface';

const AdvancedSearch: React.FC<AdvancedSearchProps> = ({
  jsonTree = emptyJsonTree,
  onChangeJsonTree,
  onChangeQueryFilter,
  searchIndex,
}) => {
  const [config, setConfig] = useState<Config>(getQbConfigs(searchIndex));

  const immutableTree = useMemo(
    () => QbUtils.checkTree(QbUtils.loadTree(jsonTree), config),
    [jsonTree]
  );

  useEffect(() => setConfig(getQbConfigs(searchIndex)), [searchIndex]);

  useEffect(
    () =>
      onChangeQueryFilter({
        query: elasticSearchFormat(immutableTree, config),
      }),
    [immutableTree, config]
  );

  return (
    <Query
      {...config}
      renderBuilder={(props) => (
        <div className="query-builder-container query-builder qb-lite">
          <Builder {...props} />
        </div>
      )}
      value={immutableTree}
      onChange={(nTree, nConfig) => {
        setConfig(nConfig);
        onChangeJsonTree(QbUtils.getTree(nTree));
      }}
    />
  );
};

export default AdvancedSearch;
