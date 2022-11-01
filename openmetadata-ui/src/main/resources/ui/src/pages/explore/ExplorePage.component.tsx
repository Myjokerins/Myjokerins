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

import { isNil, isString } from 'lodash';
import Qs from 'qs';
import React, { FunctionComponent, useEffect, useMemo, useState } from 'react';
import { useHistory, useLocation, useParams } from 'react-router-dom';
import AppState from '../../AppState';
import { searchQuery } from '../../axiosAPIs/searchAPI';
import PageContainerV1 from '../../components/containers/PageContainerV1';
import Explore from '../../components/Explore/Explore.component';
import {
  ExploreProps,
  ExploreSearchIndex,
  SearchHitCounts,
  UrlParams,
} from '../../components/Explore/explore.interface';
import { SearchIndex } from '../../enums/search.enum';
import { SearchResponse } from '../../interface/search.interface';

import { JsonTree, Utils as QbUtils } from 'react-awesome-query-builder';
import useDeepCompareEffect from 'use-deep-compare-effect';
import { PAGE_SIZE } from '../../constants/constants';
import {
  INITIAL_SORT_FIELD,
  INITIAL_SORT_ORDER,
  tabsInfo,
} from '../../constants/explore.constants';
import {
  filterObjectToElasticsearchQuery,
  isFilterObject,
} from '../../utils/FilterUtils';
import { showErrorToast } from '../../utils/ToastUtils';

const ExplorePage: FunctionComponent = () => {
  const location = useLocation();
  const history = useHistory();

  const { searchQuery: searchQueryParam = '', tab } = useParams<UrlParams>();

  const [searchResults, setSearchResults] =
    useState<SearchResponse<ExploreSearchIndex>>();

  const [advancesSearchQueryFilter, setAdvancedSearchQueryFilter] =
    useState<Record<string, unknown>>();

  const [sortValue, setSortValue] = useState<string>(INITIAL_SORT_FIELD);

  const [sortOrder, setSortOrder] = useState<string>(INITIAL_SORT_ORDER);

  const [searchHitCounts, setSearchHitCounts] = useState<SearchHitCounts>();

  const [isLoading, setIsLoading] = useState(true);

  const parsedSearch = useMemo(
    () =>
      Qs.parse(
        location.search.startsWith('?')
          ? location.search.substr(1)
          : location.search
      ),
    [location.search]
  );

  const handleSearchIndexChange: (nSearchIndex: ExploreSearchIndex) => void = (
    nSearchIndex
  ) =>
    history.push({
      pathname: `/explore/${tabsInfo[nSearchIndex].path}/${searchQueryParam}`,
    });

  const handleQueryFilterChange: ExploreProps['onChangeAdvancedSearchJsonTree'] =
    (queryFilter) =>
      history.push({
        search: Qs.stringify({
          ...parsedSearch,
          queryFilter: JSON.stringify(queryFilter),
        }),
      });

  const handlePostFilterChange: ExploreProps['onChangePostFilter'] = (
    postFilter
  ) =>
    history.push({
      search: Qs.stringify({ ...parsedSearch, postFilter }),
    });

  const handlePageChange: ExploreProps['onChangePage'] = (page) =>
    history.push({ search: Qs.stringify({ ...parsedSearch, page }) });

  const handleShowDeletedChange: ExploreProps['onChangeShowDeleted'] = (
    showDeleted
  ) => history.push({ search: Qs.stringify({ ...parsedSearch, showDeleted }) });

  const postFilter = useMemo(
    () =>
      isFilterObject(parsedSearch.postFilter)
        ? parsedSearch.postFilter
        : undefined,
    [location.search]
  );

  const elasticsearchPostFilterQuery = useMemo(
    () => filterObjectToElasticsearchQuery(postFilter),
    [postFilter]
  );

  const queryFilter = useMemo(() => {
    if (!isString(parsedSearch.queryFilter)) {
      return undefined;
    }

    try {
      const queryFilter = JSON.parse(parsedSearch.queryFilter);
      const immutableTree = QbUtils.loadTree(queryFilter as JsonTree);
      if (QbUtils.isValidTree(immutableTree)) {
        return queryFilter as JsonTree;
      }
    } catch {
      return undefined;
    }

    return undefined;
  }, [location.search]);

  useEffect(() => {
    handleQueryFilterChange(queryFilter);
  }, [queryFilter]);

  const searchIndex = useMemo(() => {
    const tabInfo = Object.entries(tabsInfo).find(
      ([, tabInfo]) => tabInfo.path === tab
    );
    if (isNil(tabInfo)) {
      return SearchIndex.TABLE;
    }

    return tabInfo[0] as ExploreSearchIndex;
  }, [tab]);

  useEffect(() => {
    handleSearchIndexChange(searchIndex);
  }, [searchIndex]);

  const page = useMemo(() => {
    const pageParam = parsedSearch.page;
    if (!isString(pageParam) || isNaN(Number.parseInt(pageParam))) {
      return 1;
    }

    return Number.parseInt(pageParam);
  }, [parsedSearch.page]);

  useEffect(() => {
    handlePageChange(page);
  }, [page]);

  const showDeleted = useMemo(() => {
    const showDeletedParam = parsedSearch.showDeleted;

    return showDeletedParam === 'true';
  }, [parsedSearch.showDeleted]);

  useDeepCompareEffect(() => {
    setIsLoading(true);
    Promise.all([
      searchQuery({
        query: searchQueryParam,
        searchIndex,
        queryFilter: advancesSearchQueryFilter,
        postFilter: elasticsearchPostFilterQuery,
        sortField: sortValue,
        sortOrder,
        pageNumber: page,
        pageSize: PAGE_SIZE,
        includeDeleted: showDeleted,
      })
        .then((res) => res)
        .then((res) => setSearchResults(res)),
      Promise.all(
        [
          SearchIndex.TABLE,
          SearchIndex.TOPIC,
          SearchIndex.DASHBOARD,
          SearchIndex.PIPELINE,
          SearchIndex.MLMODEL,
        ].map((index) =>
          searchQuery({
            query: searchQueryParam,
            pageNumber: 0,
            pageSize: 0,
            queryFilter: advancesSearchQueryFilter,
            postFilter: elasticsearchPostFilterQuery,
            searchIndex: index,
            includeDeleted: showDeleted,
            trackTotalHits: true,
            fetchSource: false,
          })
        )
      ).then(
        ([
          tableResponse,
          topicResponse,
          dashboardResponse,
          pipelineResponse,
          mlmodelResponse,
        ]) => {
          setSearchHitCounts({
            [SearchIndex.TABLE]: tableResponse.hits.total.value,
            [SearchIndex.TOPIC]: topicResponse.hits.total.value,
            [SearchIndex.DASHBOARD]: dashboardResponse.hits.total.value,
            [SearchIndex.PIPELINE]: pipelineResponse.hits.total.value,
            [SearchIndex.MLMODEL]: mlmodelResponse.hits.total.value,
          });
        }
      ),
    ])
      .catch((err) => showErrorToast(err))
      .finally(() => setIsLoading(false));
  }, [
    searchIndex,
    searchQueryParam,
    sortValue,
    sortOrder,
    showDeleted,
    advancesSearchQueryFilter,
    elasticsearchPostFilterQuery,
    page,
  ]);

  // Return to first page on filter change
  useDeepCompareEffect(
    () => handlePageChange(1),
    [
      searchIndex,
      searchQueryParam,
      sortValue,
      sortOrder,
      showDeleted,
      advancesSearchQueryFilter,
      elasticsearchPostFilterQuery,
    ]
  );

  useEffect(() => {
    AppState.updateExplorePageTab(tab);
  }, [tab]);

  return (
    <PageContainerV1>
      <Explore
        advancedSearchJsonTree={queryFilter}
        loading={isLoading}
        page={page}
        postFilter={postFilter}
        searchIndex={searchIndex}
        searchResults={searchResults}
        showDeleted={showDeleted}
        sortOrder={sortOrder}
        sortValue={sortValue}
        tabCounts={searchHitCounts}
        onChangeAdvancedSearchJsonTree={handleQueryFilterChange}
        onChangeAdvancedSearchQueryFilter={setAdvancedSearchQueryFilter}
        onChangePage={handlePageChange}
        onChangePostFilter={handlePostFilterChange}
        onChangeSearchIndex={handleSearchIndexChange}
        onChangeShowDeleted={handleShowDeletedChange}
        onChangeSortOder={setSortOrder}
        onChangeSortValue={setSortValue}
      />
    </PageContainerV1>
  );
};

export default ExplorePage;
