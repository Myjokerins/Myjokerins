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

import { Empty } from 'antd';
import { AxiosError } from 'axios';
import { capitalize, debounce } from 'lodash';
import { FormattedTableData } from 'Models';
import React, {
  FC,
  HTMLAttributes,
  useCallback,
  useEffect,
  useState,
} from 'react';
import { searchData } from '../../axiosAPIs/miscAPI';
import { FQN_SEPARATOR_CHAR } from '../../constants/char.constants';
import { PAGE_SIZE } from '../../constants/constants';
import { EntityType, FqnPart } from '../../enums/entity.enum';
import { SearchIndex } from '../../enums/search.enum';
import { EntityReference } from '../../generated/type/entityReference';
import jsonData from '../../jsons/en';
import { formatDataResponse } from '../../utils/APIUtils';
import { getPartialNameFromTableFQN } from '../../utils/CommonUtils';
import { serviceTypeLogo } from '../../utils/ServiceUtils';
import { showErrorToast } from '../../utils/ToastUtils';

interface EntitySuggestionProps extends HTMLAttributes<HTMLDivElement> {
  onSelectHandler: (value: EntityReference) => void;
  entityType: string;
}

const NodeSuggestions: FC<EntitySuggestionProps> = ({
  entityType,
  onSelectHandler,
}) => {
  const [data, setData] = useState<Array<FormattedTableData>>([]);
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [searchValue, setSearchValue] = useState<string>('');

  const getSuggestionLabel = (fqn: string, type: string, name: string) => {
    if (type === EntityType.TABLE) {
      const database = getPartialNameFromTableFQN(fqn, [FqnPart.Database]);
      const schema = getPartialNameFromTableFQN(fqn, [FqnPart.Schema]);

      return database && schema
        ? `${database}${FQN_SEPARATOR_CHAR}${schema}${FQN_SEPARATOR_CHAR}${name}`
        : name;
    } else {
      return name;
    }
  };

  const getSearchResults = async (value: string) => {
    try {
      const data = await searchData(
        value,
        1,
        PAGE_SIZE,
        '',
        '',
        '',
        SearchIndex[entityType as keyof typeof SearchIndex]
      );
      setData(formatDataResponse(data.data.hits.hits));
    } catch (error) {
      showErrorToast(
        error as AxiosError,
        jsonData['api-error-messages']['fetch-suggestions-error']
      );
    }
  };

  const debouncedOnSearch = useCallback((searchText: string): void => {
    getSearchResults(searchText);
  }, []);

  const debounceOnSearch = useCallback(debounce(debouncedOnSearch, 300), [
    debouncedOnSearch,
  ]);

  const handleChange = (e: React.ChangeEvent<{ value: string }>): void => {
    const searchText = e.target.value;
    setSearchValue(searchText);
    debounceOnSearch(searchText);
  };

  useEffect(() => {
    getSearchResults(searchValue);
  }, []);

  useEffect(() => {
    setIsOpen(data.length > 0);
  }, [data]);

  return (
    <div>
      <input
        className="tw-form-inputs tw-form-inputs-padding tw-w-full"
        placeholder={`Search for ${capitalize(entityType)}s...`}
        type="search"
        value={searchValue}
        onChange={handleChange}
      />
      {data.length > 0 && isOpen ? (
        <div
          aria-labelledby="menu-button"
          aria-orientation="vertical"
          className="tw-origin-top-right tw-absolute tw-z-20
          tw-w-max tw-mt-1 tw-rounded-md tw-shadow-lg
        tw-bg-white tw-ring-1 tw-ring-black tw-ring-opacity-5 focus:tw-outline-none"
          role="menu">
          {data.map((entity) => (
            <div
              className="tw-flex tw-items-center hover:tw-bg-body-hover"
              key={entity.fullyQualifiedName}>
              <span
                className="tw-block tw-px-2 tw-py-2 tw-text-sm tw-break-all"
                onClick={() => {
                  setIsOpen(false);
                  onSelectHandler?.({
                    description: entity.description,
                    displayName: entity.displayName,
                    id: entity.id,
                    type: entity.entityType as string,
                    name: entity.name,
                    fullyQualifiedName: entity.fullyQualifiedName,
                  });
                }}>
                <img
                  alt={entity.serviceType}
                  className="tw-inline tw-h-4 tw-mr-2"
                  src={serviceTypeLogo(entity.serviceType as string)}
                />
                {getSuggestionLabel(
                  entity.fullyQualifiedName,
                  entity.entityType as string,
                  entity.name
                )}
              </span>
            </div>
          ))}
        </div>
      ) : (
        searchValue && (
          <div className="tw-origin-top-right tw-absolute tw-z-20 tw-w-max tw-mt-1 tw-rounded-md tw-shadow-lg tw-bg-white tw-ring-1 tw-ring-black tw-ring-opacity-5 focus:tw-outline-none">
            <Empty
              description="No data found"
              image={Empty.PRESENTED_IMAGE_SIMPLE}
              style={{
                width: '326px',
                height: '70px',
              }}
            />
          </div>
        )
      )}
    </div>
  );
};

export default NodeSuggestions;
