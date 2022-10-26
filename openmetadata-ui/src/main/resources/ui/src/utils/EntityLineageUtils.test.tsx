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

import { Edge } from 'reactflow';
import {
  EdgeTypeEnum,
  SelectedEdge,
} from '../components/EntityLineage/EntityLineage.interface';
import { LineageDetails } from '../generated/api/lineage/addLineage';
import { EntityReference } from '../generated/type/entityReference';
import {
  COLUMN_LINEAGE_DETAILS,
  EDGE_TO_BE_REMOVED,
  MOCK_COLUMN_LINEAGE_EDGE,
  MOCK_LINEAGE_DATA,
  MOCK_NORMAL_LINEAGE_EDGE,
  MOCK_PARAMS_FOR_DOWN_STREAM,
  MOCK_PARAMS_FOR_UP_STREAM,
  MOCK_REMOVED_NODE,
  SELECTED_EDGE,
  UPDATED_COLUMN_LINEAGE,
  UPDATED_EDGE_PARAM,
  UPDATED_LINEAGE_EDGE,
  UP_STREAM_EDGE,
} from '../mocks/Lineage.mock';
import {
  createNewEdge,
  findUpstreamDownStreamEdge,
  getEdgeType,
  getRemovedNodeData,
  getUpdatedEdge,
  getUpdatedUpstreamDownStreamEdgeArr,
  getUpStreamDownStreamColumnLineageArr,
} from './EntityLineageUtils';

describe('Test EntityLineageUtils utility', () => {
  it('findUpstreamDownStreamEdge function should work properly', () => {
    const upstreamData = findUpstreamDownStreamEdge(
      MOCK_LINEAGE_DATA.upstreamEdges,
      SELECTED_EDGE as SelectedEdge
    );
    const nodata = findUpstreamDownStreamEdge(
      undefined,
      SELECTED_EDGE as SelectedEdge
    );

    expect(upstreamData).toStrictEqual(UP_STREAM_EDGE);
    expect(nodata).toStrictEqual(undefined);
  });

  it('getUpStreamDownStreamColumnLineageArr function should work properly', () => {
    const columnLineageData = getUpStreamDownStreamColumnLineageArr(
      MOCK_LINEAGE_DATA.upstreamEdges[0].lineageDetails as LineageDetails,
      SELECTED_EDGE as SelectedEdge
    );
    const nodata = getUpStreamDownStreamColumnLineageArr(
      MOCK_LINEAGE_DATA.upstreamEdges[1].lineageDetails as LineageDetails,
      SELECTED_EDGE as SelectedEdge
    );

    expect(columnLineageData).toStrictEqual(COLUMN_LINEAGE_DETAILS);
    expect(nodata).toStrictEqual({ sqlQuery: '', columnsLineage: [] });
  });

  it('getUpdatedUpstreamDownStreamEdgeArr function should work properly', () => {
    const columnLineageData = getUpdatedUpstreamDownStreamEdgeArr(
      MOCK_LINEAGE_DATA.upstreamEdges,
      SELECTED_EDGE as SelectedEdge,
      COLUMN_LINEAGE_DETAILS
    );
    const nodata = getUpdatedUpstreamDownStreamEdgeArr(
      [],
      SELECTED_EDGE as SelectedEdge,
      COLUMN_LINEAGE_DETAILS
    );

    expect(columnLineageData).toStrictEqual(UPDATED_LINEAGE_EDGE);
    expect(nodata).toStrictEqual([]);
  });

  it('getRemovedNodeData function should work properly', () => {
    const data = getRemovedNodeData(
      MOCK_LINEAGE_DATA.nodes,
      EDGE_TO_BE_REMOVED as Edge,
      MOCK_LINEAGE_DATA.entity,
      MOCK_LINEAGE_DATA.nodes[0]
    );
    const nodata = getRemovedNodeData(
      [],
      SELECTED_EDGE.data,
      MOCK_LINEAGE_DATA.entity,
      {} as EntityReference
    );

    expect(data).toStrictEqual(MOCK_REMOVED_NODE);
    expect(nodata).toStrictEqual({
      id: SELECTED_EDGE.data.id,
      source: MOCK_LINEAGE_DATA.entity,
      target: MOCK_LINEAGE_DATA.entity,
    });
  });

  it('getEdgeType function should work properly', () => {
    const upStreamData = getEdgeType(
      MOCK_LINEAGE_DATA,
      MOCK_PARAMS_FOR_UP_STREAM
    );
    const downStreamData = getEdgeType(
      MOCK_LINEAGE_DATA,
      MOCK_PARAMS_FOR_DOWN_STREAM
    );

    expect(upStreamData).toStrictEqual(EdgeTypeEnum.UP_STREAM);
    expect(downStreamData).toStrictEqual(EdgeTypeEnum.DOWN_STREAM);
  });

  it('getUpdatedEdge function should work properly', () => {
    const node = MOCK_LINEAGE_DATA.upstreamEdges[1];
    const data = getUpdatedEdge(
      [node],
      UPDATED_EDGE_PARAM,
      UPDATED_COLUMN_LINEAGE
    );

    expect(data).toStrictEqual([
      {
        ...node,
        lineageDetails: UPDATED_COLUMN_LINEAGE,
      },
    ]);
  });

  it('createNewEdge function should work properly', () => {
    const columnLineageEdge = createNewEdge(
      UPDATED_EDGE_PARAM,
      true,
      'table',
      'table',
      true,
      jest.fn
    );
    const normalLineageEdge = createNewEdge(
      UPDATED_EDGE_PARAM,
      true,
      'table',
      'table',
      false,
      jest.fn
    );

    const updatedColLineageEdge = MOCK_COLUMN_LINEAGE_EDGE as Edge;
    updatedColLineageEdge.data.onEdgeClick = jest.fn;

    const updatedNormalLineageEdge = MOCK_NORMAL_LINEAGE_EDGE as Edge;
    updatedNormalLineageEdge.data.onEdgeClick = jest.fn;

    expect(columnLineageEdge).toMatchObject(updatedColLineageEdge);
    expect(normalLineageEdge).toMatchObject(updatedNormalLineageEdge);
  });
});
