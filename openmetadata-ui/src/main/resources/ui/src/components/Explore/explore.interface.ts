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

import { JsonTree } from 'react-awesome-query-builder';
import { SearchIndex } from '../../enums/search.enum';
import { SearchResponse } from '../../interface/search.interface';
import { FilterObject } from '../AdvancedSearch/AdvancedSearch.interface';

export type UrlParams = {
  searchQuery: string;
  tab: string;
};

export type ExploreSearchIndex =
  | SearchIndex.TABLE
  | SearchIndex.PIPELINE
  | SearchIndex.DASHBOARD
  | SearchIndex.MLMODEL
  | SearchIndex.TOPIC;

export type SearchHitCounts = Record<ExploreSearchIndex, number>;

export interface ExploreProps {
  tabCounts?: SearchHitCounts;

  searchResults?: SearchResponse<ExploreSearchIndex>;

  advancedSearchJsonTree?: JsonTree;
  onChangeAdvancedSearchJsonTree: (jsonTree: JsonTree | undefined) => void;
  onChangeAdvancedSearchQueryFilter: (
    queryFilter: Record<string, unknown> | undefined
  ) => void;

  postFilter?: FilterObject;
  onChangePostFilter: (filter: FilterObject) => void;

  searchIndex: ExploreSearchIndex;
  onChangeSearchIndex: (searchIndex: ExploreSearchIndex) => void;

  sortValue: string;
  onChangeSortValue: (sortValue: string) => void;

  sortOrder: string;
  onChangeSortOder: (sortOder: string) => void;

  showDeleted: boolean;
  onChangeShowDeleted: (showDeleted: boolean) => void;

  page?: number;
  onChangePage?: (page: number) => void;

  loading?: boolean;
}
