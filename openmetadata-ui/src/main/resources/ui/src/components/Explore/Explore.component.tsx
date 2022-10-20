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

import {
  faSortAmountDownAlt,
  faSortAmountUpAlt,
} from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { Tabs } from 'antd';
import { AxiosError } from 'axios';
import classNames from 'classnames';
import { cloneDeep, get, isEmpty, lowerCase, toNumber } from 'lodash';
import {
  AggregationType,
  Bucket,
  FilterObject,
  FormattedTableData,
  SearchDataFunctionType,
  SearchResponse,
} from 'Models';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useHistory, useLocation } from 'react-router-dom';
import { searchData } from '../../axiosAPIs/miscAPI';
import { Button } from '../../components/buttons/Button/Button';
import ErrorPlaceHolderES from '../../components/common/error-with-placeholder/ErrorPlaceHolderES';
import FacetFilter from '../../components/common/facetfilter/FacetFilter';
import SearchedData from '../../components/searched-data/SearchedData';
import {
  getExplorePathWithSearch,
  PAGE_SIZE,
  ROUTES,
  visibleFilters,
} from '../../constants/constants';
import {
  emptyValue,
  getAggrWithDefaultValue,
  getCurrentIndex,
  getCurrentTab,
  INITIAL_FILTERS,
  INITIAL_SORT_FIELD,
  INITIAL_SORT_ORDER,
  tableSortingFields,
  tabsInfo,
  UPDATABLE_AGGREGATION,
  ZERO_SIZE,
} from '../../constants/explore.constants';
import { mockSearchData } from '../../constants/mockTourData.constants';
import { SearchIndex } from '../../enums/search.enum';
import { usePrevious } from '../../hooks/usePrevious';
import {
  getAggregationList,
  getAggregationListFromQS,
} from '../../utils/AggregationUtils';
import { formatDataResponse } from '../../utils/APIUtils';
import { getCountBadge } from '../../utils/CommonUtils';
import { getFilterCount, getFilterString } from '../../utils/FilterUtils';
import AdvancedFields from '../AdvancedSearch/AdvancedFields';
import AdvancedSearchDropDown from '../AdvancedSearch/AdvancedSearchDropDown';
import LeftPanelCard from '../common/LeftPanelCard/LeftPanelCard';
import PageLayoutV1 from '../containers/PageLayoutV1';
import {
  AdvanceField,
  ExploreProps,
  ExploreSearchData,
} from './explore.interface';
import SortingDropDown from './SortingDropDown';

const Explore: React.FC<ExploreProps> = ({
  tabCounts,
  searchText,
  initialFilter,
  searchFilter,
  tab,
  searchQuery,
  sortValue,
  fetchCount,
  handleFilterChange,
  handlePathChange,
  handleSearchText,
  showDeleted,
  onShowDeleted,
  isFilterSelected,
  handleTabCounts,
}: ExploreProps) => {
  const location = useLocation();
  const isTourPage = location.pathname.includes(ROUTES.TOUR);
  const history = useHistory();
  const filterObject: FilterObject = {
    ...INITIAL_FILTERS,
    ...initialFilter,
  };
  const [data, setData] = useState<Array<FormattedTableData>>([]);
  const [filters, setFilters] = useState<FilterObject>({
    ...filterObject,
    ...searchFilter,
  });

  const [currentPage, setCurrentPage] = useState<number>(1);
  const [totalNumberOfValue, setTotalNumberOfValues] = useState<number>(0);
  const [aggregations, setAggregations] = useState<Array<AggregationType>>([]);
  const [searchTag, setSearchTag] = useState<string>(location.search);
  const [sortField, setSortField] = useState<string>(sortValue);
  const [sortOrder, setSortOrder] = useState<string>(INITIAL_SORT_ORDER);
  const [searchIndex, setSearchIndex] = useState<string>(getCurrentIndex(tab));
  const [currentTab, setCurrentTab] = useState<number>(getCurrentTab(tab));
  const [error, setError] = useState<string>('');
  const currentSearchIndex = useRef<string>();

  const [isEntityLoading, setIsEntityLoading] = useState(true);
  const [isFilterSet, setIsFilterSet] = useState<boolean>(
    !isEmpty(initialFilter)
  );
  const [connectionError] = useState(error.includes('Connection refused'));
  const isMounting = useRef(true);
  const forceSetAgg = useRef(false);
  const previsouIndex = usePrevious(searchIndex);
  const [fieldList, setFieldList] =
    useState<Array<{ name: string; value: string }>>(tableSortingFields);

  const [selectedAdvancedFields, setSelectedAdvancedField] = useState<
    Array<AdvanceField>
  >([]);
  const [isInitialFilterSet, setIsInitialFilterSet] = useState<boolean>(
    !isEmpty(initialFilter)
  );

  const onAdvancedFieldSelect = (value: string) => {
    const flag = selectedAdvancedFields.some((field) => field.key === value);
    if (!flag) {
      setSelectedAdvancedField((pre) => [
        ...pre,
        { key: value, value: undefined },
      ]);
    }
  };
  const onAdvancedFieldRemove = (value: string) => {
    setSelectedAdvancedField((pre) =>
      pre.filter((field) => field.key !== value)
    );
  };

  const onAdvancedFieldClear = () => {
    setSelectedAdvancedField([]);
  };

  const onAdvancedFieldValueSelect = (field: AdvanceField) => {
    setSelectedAdvancedField((pre) => {
      return pre.map((preField) => {
        if (preField.key === field.key) {
          return field;
        } else {
          return preField;
        }
      });
    });
  };

  const handleSelectedFilter = (
    checked: boolean,
    selectedFilter: string,
    type: keyof typeof filterObject
  ) => {
    let filterData;
    if (checked) {
      const filterType = filters[type];
      if (filterType.includes(selectedFilter)) {
        filterData = { ...filters };
      } else {
        setIsFilterSet(true);

        filterData = {
          ...filters,
          [type]: [...filters[type], selectedFilter],
        };
      }
    } else {
      if (searchTag.includes(selectedFilter)) {
        setSearchTag('');
      }
      const filter = filters[type];
      const index = filter.indexOf(`"${selectedFilter.replace(/ /g, '+')}"`);
      filter.splice(index, 1);
      const selectedFilterCount = getFilterCount(filters);
      setIsFilterSet(selectedFilterCount >= 1);

      filterData = { ...filters, [type]: filter };
    }

    handleFilterChange(filterData);
  };

  const handleFieldDropDown = (value: string) => {
    setSortField(value);
  };

  const handleShowDeleted = (checked: boolean) => {
    onShowDeleted(checked);
  };

  const onClearFilterHandler = (type: string[], isForceClear = false) => {
    setSelectedAdvancedField([]);
    const updatedFilter = type.reduce((filterObj, type) => {
      return { ...filterObj, [type]: [] };
    }, {});
    const queryParamFilters = initialFilter;
    setIsFilterSet(false);

    handleFilterChange({
      ...updatedFilter,
      ...(isForceClear ? {} : queryParamFilters),
    });
  };

  const paginate = (pageNumber: string | number) => {
    setCurrentPage(pageNumber as number);
  };

  const updateAggregationCount = useCallback(
    (newAggregations: Array<AggregationType>) => {
      const oldAggs = cloneDeep(aggregations);
      for (const newAgg of newAggregations) {
        for (const oldAgg of oldAggs) {
          if (newAgg.title === oldAgg.title) {
            if (UPDATABLE_AGGREGATION.includes(newAgg.title)) {
              const buckets = cloneDeep(oldAgg.buckets)
                .map((item) => {
                  // eslint-disable-next-line @typescript-eslint/camelcase
                  return { ...item, doc_count: 0 };
                })
                .concat(newAgg.buckets);
              const bucketHashmap = buckets.reduce((obj, item) => {
                obj[item.key]
                  ? // eslint-disable-next-line @typescript-eslint/camelcase
                    (obj[item.key].doc_count += item.doc_count)
                  : (obj[item.key] = { ...item });

                return obj;
              }, {} as { [key: string]: Bucket });
              oldAgg.buckets = Object.values(bucketHashmap);
            } else {
              oldAgg.buckets = newAgg.buckets;
            }
          }
        }
      }
      setAggregations(oldAggs);
    },
    [aggregations, filters]
  );

  const updateSearchResults = (res: SearchResponse) => {
    const hits = res.data.hits.hits;
    if (hits.length > 0) {
      setTotalNumberOfValues(res.data.hits.total.value);
      setData(formatDataResponse(hits));
    } else {
      setData([]);
      setTotalNumberOfValues(0);
    }
  };

  const setCount = (count = 0, index = searchIndex) => {
    switch (index) {
      case SearchIndex.TABLE:
        handleTabCounts({ table: count });

        break;
      case SearchIndex.DASHBOARD:
        handleTabCounts({ dashboard: count });

        break;
      case SearchIndex.TOPIC:
        handleTabCounts({ topic: count });

        break;
      case SearchIndex.PIPELINE:
        handleTabCounts({ pipeline: count });

        break;
      case SearchIndex.MLMODEL:
        handleTabCounts({ mlmodel: count });

        break;
      default:
        break;
    }
  };

  const updateData = (searchResult: ExploreSearchData) => {
    if (searchResult) {
      updateSearchResults(searchResult.resSearchResults);
      setCount(searchResult.resSearchResults.data.hits.total.value);
      if (forceSetAgg.current) {
        setAggregations(
          searchResult.resSearchResults.data.hits.hits.length > 0
            ? getAggregationList(
                searchResult.resSearchResults.data.aggregations
              )
            : getAggregationListFromQS(location.search)
        );
        setIsInitialFilterSet(false);
      } else {
        const aggServiceType = getAggregationList(
          searchResult.resAggServiceType.data.aggregations,
          'service'
        );
        const aggTier = getAggregationList(
          searchResult.resAggTier.data.aggregations,
          'tier'
        );
        const aggTag = getAggregationList(
          searchResult.resAggTag.data.aggregations,
          'tags'
        );
        const aggDatabase = getAggregationList(
          searchResult.resAggDatabase.data.aggregations,
          'database'
        );
        const aggDatabaseSchema = getAggregationList(
          searchResult.resAggDatabaseSchema.data.aggregations,
          'databaseschema'
        );
        const aggServiceName = getAggregationList(
          searchResult.resAggServiceName.data.aggregations,
          'servicename'
        );

        updateAggregationCount([
          ...aggServiceType,
          ...aggTier,
          ...aggTag,
          ...aggDatabase,
          ...aggDatabaseSchema,
          ...aggServiceName,
        ]);
      }
    }
    setIsEntityLoading(false);
  };

  const fetchData = (value: SearchDataFunctionType[]) => {
    if (isTourPage) {
      updateData(mockSearchData as unknown as ExploreSearchData);
    } else {
      const promiseValue = value.map((d) => {
        currentSearchIndex.current = d.searchIndex;

        return searchData(
          d.queryString,
          d.from,
          d.size,
          d.filters,
          d.sortField,
          d.sortOrder,
          d.searchIndex,
          showDeleted
        );
      });

      Promise.all(promiseValue)
        .then(
          ([
            resSearchResults,
            resAggServiceType,
            resAggTier,
            resAggTag,
            resAggDatabase,
            resAggDatabaseSchema,
            resAggServiceName,
          ]: Array<SearchResponse>) => {
            setError('');
            if (
              currentSearchIndex.current ===
                resSearchResults.data.hits.hits[0]?._index ||
              isEmpty(resSearchResults.data.hits.hits)
            ) {
              updateData({
                resSearchResults,
                resAggServiceType,
                resAggTier,
                resAggTag,
                resAggDatabase,
                resAggDatabaseSchema,
                resAggServiceName,
              });
              if (isEmpty(resSearchResults.data.hits.hits)) {
                setTotalNumberOfValues(0);
                setIsEntityLoading(false);
              }
            }
          }
        )
        .catch((err: AxiosError) => {
          const errMsg = get(err, 'response.data.responseMessage', '');
          setError(errMsg);
        });
    }
  };

  const fetchTableData = () => {
    setIsEntityLoading(true);
    const fetchParams = [
      {
        queryString: searchText,
        from: currentPage,
        size: PAGE_SIZE,
        filters: getFilterString(filters),
        sortField: sortField,
        sortOrder: sortOrder,
        searchIndex: searchIndex,
      },
      {
        queryString: searchText,
        from: currentPage,
        size: ZERO_SIZE,
        filters: getFilterString(filters, ['service']),
        sortField: sortField,
        sortOrder: sortOrder,
        searchIndex: searchIndex,
      },
      {
        queryString: searchText,
        from: currentPage,
        size: ZERO_SIZE,
        filters: getFilterString(filters, ['tier']),
        sortField: sortField,
        sortOrder: sortOrder,
        searchIndex: searchIndex,
      },
      {
        queryString: searchText,
        from: currentPage,
        size: ZERO_SIZE,
        filters: getFilterString(filters, ['tags']),
        sortField: sortField,
        sortOrder: sortOrder,
        searchIndex: searchIndex,
      },
      {
        queryString: searchText,
        from: currentPage,
        size: ZERO_SIZE,
        filters: getFilterString(filters, ['database']),
        sortField: sortField,
        sortOrder: sortOrder,
        searchIndex: searchIndex,
      },
      {
        queryString: searchText,
        from: currentPage,
        size: ZERO_SIZE,
        filters: getFilterString(filters, ['databaseschema']),
        sortField: sortField,
        sortOrder: sortOrder,
        searchIndex: searchIndex,
      },
      {
        queryString: searchText,
        from: currentPage,
        size: ZERO_SIZE,
        filters: getFilterString(filters, ['servicename']),
        sortField: sortField,
        sortOrder: sortOrder,
        searchIndex: searchIndex,
      },
    ];

    fetchData(fetchParams);
  };

  const getFacetedFilter = () => {
    const facetFilters: FilterObject = cloneDeep(filterObject);
    for (const key in filters) {
      if (visibleFilters.includes(key)) {
        facetFilters[key as keyof typeof filterObject] =
          filters[key as keyof typeof filterObject];
      }
    }

    return facetFilters;
  };

  const handleOrder = (value: string) => {
    setSortOrder(value);
  };

  const getSortingElements = () => {
    return (
      <div className="tw-flex">
        <AdvancedSearchDropDown
          index={searchIndex}
          selectedItems={selectedAdvancedFields}
          onSelect={onAdvancedFieldSelect}
        />

        <SortingDropDown
          fieldList={fieldList}
          handleFieldDropDown={handleFieldDropDown}
          sortField={sortField}
        />

        <div className="tw-flex">
          {sortOrder === 'asc' ? (
            <button className="tw-mt-2" onClick={() => handleOrder('desc')}>
              <FontAwesomeIcon
                className="tw-text-base tw-text-primary"
                data-testid="last-updated"
                icon={faSortAmountDownAlt}
              />
            </button>
          ) : (
            <button className="tw-mt-2" onClick={() => handleOrder('asc')}>
              <FontAwesomeIcon
                className="tw-text-base tw-text-primary"
                data-testid="last-updated"
                icon={faSortAmountUpAlt}
              />
            </button>
          )}
        </div>
      </div>
    );
  };

  const resetFilters = (isForceReset = false) => {
    onClearFilterHandler(visibleFilters, isForceReset);
  };

  const getTabCount = (index: string, isActive: boolean, className = '') => {
    switch (index) {
      case SearchIndex.TABLE:
        return getCountBadge(tabCounts.table, className, isActive);
      case SearchIndex.TOPIC:
        return getCountBadge(tabCounts.topic, className, isActive);
      case SearchIndex.DASHBOARD:
        return getCountBadge(tabCounts.dashboard, className, isActive);
      case SearchIndex.PIPELINE:
        return getCountBadge(tabCounts.pipeline, className, isActive);
      case SearchIndex.MLMODEL:
        return getCountBadge(tabCounts.mlmodel, className, isActive);
      default:
        return getCountBadge();
    }
  };
  const onTabChange = (selectedTab: number) => {
    if (tabsInfo[selectedTab - 1].path !== tab) {
      setIsEntityLoading(true);
      setData([]);
      handlePathChange(tabsInfo[selectedTab - 1].path);
      resetFilters();
      history.push({
        pathname: getExplorePathWithSearch(
          searchQuery,
          tabsInfo[selectedTab - 1].path
        ),
        search: location.search,
      });
    }
  };

  const getData = () => {
    if (!isMounting.current && previsouIndex === getCurrentIndex(tab)) {
      if (isInitialFilterSet) {
        forceSetAgg.current = isInitialFilterSet;
      } else {
        forceSetAgg.current = !isFilterSet;
      }
      fetchTableData();
    }
  };

  const handleAdvancedSearch = (advancedFields: AdvanceField[]) => {
    const advancedFilterObject: FilterObject = {};
    advancedFields.forEach((field) => {
      if (field.value) {
        advancedFilterObject[field.key] = [field.value];
      }
    });

    handleFilterChange(advancedFilterObject);
  };

  useEffect(() => {
    isTourPage
      ? updateData(mockSearchData as unknown as ExploreSearchData)
      : handleSearchText && handleSearchText(searchQuery || emptyValue);
    setCurrentPage(1);
  }, [searchQuery]);

  useEffect(() => {
    setFieldList(tabsInfo[getCurrentTab(tab) - 1].sortingFields);
    // if search text is there then set sortfield as ''(Relevance)
    setSortField(searchText ? '' : tabsInfo[getCurrentTab(tab) - 1].sortField);
    setSortOrder(INITIAL_SORT_ORDER);
    setCurrentTab(getCurrentTab(tab));
    setSearchIndex(getCurrentIndex(tab));
    setCurrentPage(1);
    if (!isMounting.current) {
      fetchCount();
      handleFilterChange(filterObject);
    }
  }, [tab]);

  useEffect(() => {
    setFilters({
      ...filterObject,
      ...initialFilter,
      ...searchFilter,
    });
  }, [initialFilter, searchFilter]);

  useEffect(() => {
    if (getFilterString(filters)) {
      setCurrentPage(1);
    }
  }, [searchText, filters]);

  useEffect(() => {
    forceSetAgg.current = true;
    if (!isMounting.current) {
      fetchTableData();
    }
  }, [searchText, searchIndex, showDeleted]);

  useEffect(() => {
    getData();
  }, [currentPage, sortField, sortOrder]);

  useEffect(() => {
    if (currentPage === 1) {
      getData();
    } else {
      setCurrentPage(1);
    }
  }, [filters]);

  /**
   * on index change clear the filters
   */
  useEffect(() => {
    if (!isMounting.current) {
      setSelectedAdvancedField([]);
    }
  }, [searchIndex]);

  /**
   * if search query is there then make sortfield as empty (Relevance)
   * otherwise change it to INITIAL_SORT_FIELD (last_updated)
   */
  useEffect(() => {
    if (searchText) {
      setSortField('');
    } else {
      setSortField(INITIAL_SORT_FIELD);
    }
  }, [searchText]);

  /**
   * on advance field change call handleAdvancedSearch methdod
   */
  useEffect(() => {
    if (!isMounting.current) {
      handleAdvancedSearch(selectedAdvancedFields);
    }
  }, [selectedAdvancedFields]);

  // alwyas Keep this useEffect at the end...
  useEffect(() => {
    isMounting.current = false;
  }, []);

  const fetchLeftPanel = () => {
    return (
      <LeftPanelCard id="explorer">
        <div className="tw-py-3" data-testid="data-summary-container">
          <div className="tw-w-64 tw-px-3 tw-flex-shrink-0">
            <Button
              className={classNames('tw-underline tw-pb-4')}
              disabled={!getFilterCount(filters)}
              size="custom"
              theme="primary"
              variant="link"
              onClick={() => resetFilters(true)}>
              Clear All
            </Button>
          </div>
          <div className="tw-filter-seperator" />
          {!error && (
            <FacetFilter
              aggregations={getAggrWithDefaultValue(
                aggregations,
                visibleFilters
              )}
              filters={getFacetedFilter()}
              showDeletedOnly={showDeleted}
              onSelectDeleted={handleShowDeleted}
              onSelectHandler={handleSelectedFilter}
            />
          )}
        </div>
      </LeftPanelCard>
    );
  };

  const advanceFieldCheck =
    !connectionError && Boolean(selectedAdvancedFields.length);

  return (
    <PageLayoutV1
      className="tw-h-full tw-px-6"
      leftPanel={Boolean(!error) && fetchLeftPanel()}>
      {error ? (
        <ErrorPlaceHolderES errorMessage={error} type="error" />
      ) : (
        <div>
          {!connectionError && (
            <Tabs
              defaultActiveKey={lowerCase(tabsInfo[0].label)}
              size="small"
              tabBarExtraContent={getSortingElements()}
              onChange={(tab) => {
                tab && onTabChange(toNumber(tab));
              }}>
              {tabsInfo.map((tabDetail) => (
                <Tabs.TabPane
                  key={tabDetail.tab}
                  tab={
                    <div data-testid={`${lowerCase(tabDetail.label)}-tab`}>
                      {tabDetail.label}
                      <span className="p-l-xs ">
                        {getTabCount(
                          tabDetail.index,
                          tabDetail.tab === currentTab
                        )}
                      </span>
                    </div>
                  }
                />
              ))}
            </Tabs>
          )}
          {advanceFieldCheck && (
            <AdvancedFields
              fields={selectedAdvancedFields}
              index={searchIndex}
              onClear={onAdvancedFieldClear}
              onFieldRemove={onAdvancedFieldRemove}
              onFieldValueSelect={onAdvancedFieldValueSelect}
            />
          )}
          <SearchedData
            showResultCount
            currentPage={currentPage}
            data={data}
            isFilterSelected={isFilterSelected}
            isLoading={!isTourPage && isEntityLoading}
            paginate={paginate}
            searchText={searchText}
            totalValue={totalNumberOfValue}
          />
        </div>
      )}
    </PageLayoutV1>
  );
};

export default Explore;
