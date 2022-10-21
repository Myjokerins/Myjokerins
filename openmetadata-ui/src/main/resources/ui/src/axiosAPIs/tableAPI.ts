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

import { AxiosResponse } from 'axios';
import { Operation } from 'fast-json-patch';
import { CreateTable } from '../generated/api/data/createTable';
import {
  ColumnProfile,
  Table,
  TableProfile,
  TableProfilerConfig,
} from '../generated/entity/data/table';
import { EntityHistory } from '../generated/type/entityHistory';
import { EntityReference } from '../generated/type/entityReference';
import { Paging } from '../generated/type/paging';
import { getURLWithQueryFields } from '../utils/APIUtils';
import APIClient from './index';

export const getTableDetails = async (
  id: string,
  arrQueryFields: string | string[]
) => {
  const url = getURLWithQueryFields(`/tables/${id}`, arrQueryFields);

  const response = await APIClient.get<Table>(url);

  return response.data;
};

export const getTableVersions = async (id: string) => {
  const url = `/tables/${id}/versions`;

  const response = await APIClient.get<EntityHistory>(url);

  return response.data;
};

export const getTableVersion = async (id: string, version: string) => {
  const url = `/tables/${id}/versions/${version}`;

  const response = await APIClient.get(url);

  return response.data;
};

export const getTableDetailsByFQN = async (
  fqn: string,
  arrQueryFields: string | string[],
  include = 'all'
) => {
  const url = getURLWithQueryFields(
    `/tables/name/${fqn}`,
    arrQueryFields,
    `include=${include}`
  );

  const response = await APIClient.get<Table>(url);

  return response.data;
};

export const getDatabaseTables: Function = (
  databaseName: string,
  paging: string,
  arrQueryFields?: string
): Promise<AxiosResponse> => {
  const url = `${getURLWithQueryFields(
    `/tables`,
    arrQueryFields
  )}&database=${databaseName}${paging ? paging : ''}`;

  return APIClient.get(url);
};

export const patchTableDetails = async (id: string, data: Operation[]) => {
  const configOptions = {
    headers: { 'Content-type': 'application/json-patch+json' },
  };

  const response = await APIClient.patch<Operation[], AxiosResponse<Table>>(
    `/tables/${id}`,
    data,
    configOptions
  );

  return response.data;
};

export const restoreTable = async (data: CreateTable) => {
  const configOptions = {
    headers: { 'Content-type': 'application/json' },
  };

  const response = await APIClient.put<CreateTable, AxiosResponse<Table>>(
    '/tables',
    data,
    configOptions
  );

  return response.data;
};

export const addFollower = async (tableId: string, userId: string) => {
  const configOptions = {
    headers: { 'Content-type': 'application/json' },
  };

  const response = await APIClient.put<
    string,
    AxiosResponse<{
      changeDescription: { fieldsAdded: { newValue: EntityReference[] }[] };
    }>
  >(`/tables/${tableId}/followers`, userId, configOptions);

  return response.data;
};

export const removeFollower = async (tableId: string, userId: string) => {
  const configOptions = {
    headers: { 'Content-type': 'application/json' },
  };

  const response = await APIClient.delete<
    string,
    AxiosResponse<{
      changeDescription: { fieldsDeleted: { oldValue: EntityReference[] }[] };
    }>
  >(`/tables/${tableId}/followers/${userId}`, configOptions);

  return response.data;
};

export const getTableProfilerConfig = async (tableId: string) => {
  const response = await APIClient.get<Table>(
    `/tables/${tableId}/tableProfilerConfig`
  );

  return response.data;
};

export const putTableProfileConfig = async (
  tableId: string,
  data: TableProfilerConfig
) => {
  const configOptions = {
    headers: { 'Content-type': 'application/json' },
  };

  const response = await APIClient.put<
    TableProfilerConfig,
    AxiosResponse<Table>
  >(`/tables/${tableId}/tableProfilerConfig`, data, configOptions);

  return response.data;
};

export const getTableProfilesList = async (
  tableId: string,
  params?: {
    startTs?: number;
    endTs?: number;
    limit?: number;
    before?: string;
    after?: string;
  }
) => {
  const url = `/tables/${tableId}/tableProfile`;

  const response = await APIClient.get<{
    data: TableProfile[];
    paging: Paging;
  }>(url, { params });

  return response.data;
};

export const getColumnProfilerList = async (
  columnFqn: string,
  params?: {
    startTs?: number;
    endTs?: number;
    limit?: number;
    before?: string;
    after?: string;
  }
) => {
  const url = `/tables/${columnFqn}/columnProfile`;

  const response = await APIClient.get<{
    data: ColumnProfile[];
    paging: Paging;
  }>(url, { params });

  return response.data;
};
