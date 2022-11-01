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
  faChevronLeft,
  faChevronRight,
} from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import dagre from 'dagre';
import { isEmpty, isNil, isUndefined } from 'lodash';
import { LeafNodes, LineagePos, LoadingNodeState, LoadingState } from 'Models';
import React, { Fragment, MouseEvent as ReactMouseEvent } from 'react';
import { Link } from 'react-router-dom';
import {
  Connection,
  Edge,
  MarkerType,
  Node,
  Position,
  ReactFlowInstance,
} from 'reactflow';
import {
  CustomEdgeData,
  CustomElement,
  CustomFlow,
  EdgeData,
  EdgeTypeEnum,
  ModifiedColumn,
  SelectedEdge,
  SelectedNode,
} from '../components/EntityLineage/EntityLineage.interface';
import Loader from '../components/Loader/Loader';
import { FQN_SEPARATOR_CHAR } from '../constants/char.constants';
import {
  NODE_HEIGHT,
  NODE_WIDTH,
  ZOOM_VALUE,
} from '../constants/Lineage.constants';
import {
  EntityLineageDirection,
  EntityLineageNodeType,
  EntityType,
  FqnPart,
} from '../enums/entity.enum';
import { Column } from '../generated/entity/data/table';
import {
  ColumnLineage,
  Edge as EntityLineageEdge,
  EntityLineage,
  LineageDetails,
} from '../generated/type/entityLineage';
import { EntityReference } from '../generated/type/entityReference';
import {
  getPartialNameFromFQN,
  getPartialNameFromTableFQN,
  prepareLabel,
} from './CommonUtils';
import { isLeafNode } from './EntityUtils';
import SVGIcons from './SvgUtils';
import { getEntityLink } from './TableUtils';

export const getHeaderLabel = (
  name = '',
  fqn = '',
  type: string,
  isMainNode: boolean
) => {
  return (
    <Fragment>
      {isMainNode ? (
        <span
          className="tw-break-words description-text tw-self-center tw-font-medium"
          data-testid="lineage-entity">
          {name || prepareLabel(type, fqn, false)}
        </span>
      ) : (
        <span
          className="tw-break-words description-text tw-self-center link-text tw-font-medium"
          data-testid="lineage-entity">
          <Link to={getEntityLink(type, fqn)}>
            {name || prepareLabel(type, fqn, false)}
          </Link>
        </span>
      )}
    </Fragment>
  );
};

export const onLoad = (reactFlowInstance: ReactFlowInstance) => {
  reactFlowInstance.fitView();
  reactFlowInstance.zoomTo(ZOOM_VALUE);
};
/* eslint-disable-next-line */
export const onNodeMouseEnter = (_event: ReactMouseEvent, _node: Node) => {
  return;
};
/* eslint-disable-next-line */
export const onNodeMouseMove = (_event: ReactMouseEvent, _node: Node) => {
  return;
};
/* eslint-disable-next-line */
export const onNodeMouseLeave = (_event: ReactMouseEvent, _node: Node) => {
  return;
};
/* eslint-disable-next-line */
export const onNodeContextMenu = (event: ReactMouseEvent, _node: Node) => {
  event.preventDefault();
};

export const dragHandle = (event: ReactMouseEvent) => {
  event.stopPropagation();
};

const getNodeType = (entityLineage: EntityLineage, id: string) => {
  const upStreamEdges = entityLineage.upstreamEdges || [];
  const downStreamEdges = entityLineage.downstreamEdges || [];

  const hasDownStreamToEntity = downStreamEdges.find(
    (down) => down.toEntity === id
  );
  const hasDownStreamFromEntity = downStreamEdges.find(
    (down) => down.fromEntity === id
  );
  const hasUpstreamFromEntity = upStreamEdges.find(
    (up) => up.fromEntity === id
  );
  const hasUpstreamToEntity = upStreamEdges.find((up) => up.toEntity === id);

  if (hasDownStreamToEntity && !hasDownStreamFromEntity)
    return EntityLineageNodeType.OUTPUT;
  if (hasUpstreamFromEntity && !hasUpstreamToEntity)
    return EntityLineageNodeType.INPUT;

  return EntityLineageNodeType.DEFAULT;
};

export const getColumnType = (edges: Edge[], id: string) => {
  const sourceEdge = edges.find((edge) => edge.sourceHandle === id);
  const targetEdge = edges.find((edge) => edge.targetHandle === id);

  if (sourceEdge?.sourceHandle === id && targetEdge?.targetHandle === id)
    return EntityLineageNodeType.DEFAULT;
  if (sourceEdge?.sourceHandle === id) return EntityLineageNodeType.INPUT;
  if (targetEdge?.targetHandle === id) return EntityLineageNodeType.OUTPUT;

  return EntityLineageNodeType.NOT_CONNECTED;
};

export const getLineageData = (
  entityLineage: EntityLineage,
  onSelect: (state: boolean, value: SelectedNode) => void,
  loadNodeHandler: (node: EntityReference, pos: LineagePos) => void,
  lineageLeafNodes: LeafNodes,
  isNodeLoading: LoadingNodeState,
  getNodeLabel: (node: EntityReference) => React.ReactNode,
  isEditMode: boolean,
  edgeType: string,
  onEdgeClick: (
    evt: React.MouseEvent<HTMLButtonElement>,
    data: CustomEdgeData
  ) => void,
  removeNodeHandler: (node: Node) => void,
  columns: { [key: string]: Column[] },
  currentData: { nodes: Node[]; edges: Edge[] }
) => {
  const [x, y] = [0, 0];
  const nodes = [...(entityLineage['nodes'] || []), entityLineage['entity']];
  const edgesV1 = [
    ...(entityLineage.downstreamEdges || []),
    ...(entityLineage.upstreamEdges || []),
  ];

  const lineageEdgesV1: Edge[] = [];
  const mainNode = entityLineage['entity'];

  edgesV1.forEach((edge) => {
    const sourceType = nodes.find((n) => edge.fromEntity === n.id);
    const targetType = nodes.find((n) => edge.toEntity === n.id);

    if (!isUndefined(edge.lineageDetails)) {
      edge.lineageDetails.columnsLineage?.forEach((e) => {
        const toColumn = e.toColumn || '';
        if (e.fromColumns && e.fromColumns.length > 0) {
          e.fromColumns.forEach((fromColumn) => {
            lineageEdgesV1.push({
              id: `column-${fromColumn}-${toColumn}-edge-${edge.fromEntity}-${edge.toEntity}`,
              source: edge.fromEntity,
              target: edge.toEntity,
              targetHandle: toColumn,
              sourceHandle: fromColumn,
              type: isEditMode ? edgeType : 'custom',
              markerEnd: {
                type: MarkerType.ArrowClosed,
              },
              data: {
                id: `column-${fromColumn}-${toColumn}-edge-${edge.fromEntity}-${edge.toEntity}`,
                source: edge.fromEntity,
                target: edge.toEntity,
                targetHandle: toColumn,
                sourceHandle: fromColumn,
                onEdgeClick,
                isColumnLineage: true,
              },
            });
          });
        }
      });
    }

    lineageEdgesV1.push({
      id: `edge-${edge.fromEntity}-${edge.toEntity}`,
      source: `${edge.fromEntity}`,
      target: `${edge.toEntity}`,
      type: isEditMode ? edgeType : 'custom',
      style: { strokeWidth: '2px' },
      markerEnd: {
        type: MarkerType.ArrowClosed,
      },
      data: {
        id: `edge-${edge.fromEntity}-${edge.toEntity}`,
        source: `${edge.fromEntity}`,
        target: `${edge.toEntity}`,
        sourceType: sourceType?.type,
        targetType: targetType?.type,
        onEdgeClick,
        isColumnLineage: false,
      },
    });
  });

  const makeNode = (node: EntityReference) => {
    const type = getNodeType(entityLineage, node.id);
    const cols: { [key: string]: ModifiedColumn } = {};
    columns[node.id]?.forEach((col) => {
      cols[col.fullyQualifiedName || col.name] = {
        ...col,
        type: isEditMode
          ? EntityLineageNodeType.DEFAULT
          : getColumnType(lineageEdgesV1, col.fullyQualifiedName || col.name),
      };
    });
    const currentNode = currentData?.nodes?.find((n) => n.id === node.id);

    return {
      id: `${node.id}`,
      sourcePosition: Position.Right,
      targetPosition: Position.Left,
      type: isEditMode ? EntityLineageNodeType.DEFAULT : type,
      className: 'leaf-node',
      data: {
        label: (
          <div className="tw-flex">
            {type === EntityLineageNodeType.INPUT && (
              <div
                className="tw-pr-2 tw-self-center tw-cursor-pointer "
                onClick={(e) => {
                  e.stopPropagation();
                  onSelect(false, {} as SelectedNode);
                  if (node) {
                    loadNodeHandler(node, 'from');
                  }
                }}>
                {!isLeafNode(lineageLeafNodes, node?.id as string, 'from') &&
                !node.id.includes(isNodeLoading.id as string) ? (
                  <FontAwesomeIcon
                    className="tw-text-primary tw-mr-2"
                    icon={faChevronLeft}
                  />
                ) : null}
                {isNodeLoading.state &&
                node.id.includes(isNodeLoading.id as string) ? (
                  <Loader size="small" type="default" />
                ) : null}
              </div>
            )}

            <div>{getNodeLabel(node)}</div>

            {type === EntityLineageNodeType.OUTPUT && (
              <div
                className="tw-pl-2 tw-self-center tw-cursor-pointer "
                onClick={(e) => {
                  e.stopPropagation();
                  onSelect(false, {} as SelectedNode);
                  if (node) {
                    loadNodeHandler(node, 'to');
                  }
                }}>
                {!isLeafNode(lineageLeafNodes, node?.id as string, 'to') &&
                !node.id.includes(isNodeLoading.id as string) ? (
                  <FontAwesomeIcon
                    className="tw-text-primary tw-ml-2"
                    icon={faChevronRight}
                  />
                ) : null}
                {isNodeLoading.state &&
                node.id.includes(isNodeLoading.id as string) ? (
                  <Loader size="small" type="default" />
                ) : null}
              </div>
            )}
          </div>
        ),
        entityType: node.type,
        removeNodeHandler,
        isEditMode,
        isExpanded: currentNode?.data?.isExpanded || false,
        columns: cols,
      },
      position: {
        x: x,
        y: y,
      },
    };
  };

  const mainCols: { [key: string]: ModifiedColumn } = {};
  columns[mainNode.id]?.forEach((col) => {
    mainCols[col.fullyQualifiedName || col.name] = {
      ...col,
      type: isEditMode
        ? EntityLineageNodeType.DEFAULT
        : getColumnType(lineageEdgesV1, col.fullyQualifiedName || col.name),
    };
  });
  const currentNode = currentData?.nodes?.find((n) => n.id === mainNode.id)
    ?.data.isExpanded;

  const lineageData = [
    {
      id: `${mainNode.id}`,
      sourcePosition: 'right',
      targetPosition: 'left',
      type: getNodeType(entityLineage, mainNode.id),
      className: `leaf-node ${!isEditMode ? 'core' : ''}`,
      data: {
        label: getNodeLabel(mainNode),
        isEditMode,
        removeNodeHandler,
        columns: mainCols,
        isExpanded: currentNode || false,
      },
      position: { x: x, y: y },
    },
  ];

  (entityLineage.nodes || []).forEach((n) => lineageData.push(makeNode(n)));

  return { node: lineageData, edge: lineageEdgesV1 };
};

export const getDataLabel = (
  displayName?: string,
  fqn = '',
  isTextOnly = false,
  type?: string
) => {
  const databaseName = getPartialNameFromTableFQN(fqn, [FqnPart.Database]);
  const schemaName = getPartialNameFromTableFQN(fqn, [FqnPart.Schema]);

  let label = '';
  if (displayName) {
    label = displayName;
  } else {
    label = prepareLabel(type as string, fqn);
  }

  if (isTextOnly) {
    return label;
  } else {
    return (
      <span
        className="tw-break-words tw-self-center tw-w-60"
        data-testid="lineage-entity">
        {type === 'table'
          ? databaseName && schemaName
            ? `${databaseName}${FQN_SEPARATOR_CHAR}${schemaName}${FQN_SEPARATOR_CHAR}${label}`
            : label
          : label}
      </span>
    );
  }
};

export const getNoLineageDataPlaceholder = () => {
  return (
    <div className="tw-mt-4 tw-ml-4 tw-flex tw-justify-center tw-font-medium tw-items-center tw-border tw-border-main tw-rounded-md tw-p-8">
      <span>
        Lineage is currently supported for Airflow. To enable lineage collection
        from Airflow, please follow the documentation
      </span>
      <Link
        className="tw-ml-1"
        target="_blank"
        to={{
          pathname:
            'https://docs.open-metadata.org/openmetadata/connectors/pipeline/airflow/lineage-backend',
        }}>
        here.
      </Link>
    </div>
  );
};
export const getDeletedLineagePlaceholder = () => {
  return (
    <div className="tw-mt-4 tw-ml-4 tw-flex tw-justify-center tw-font-medium tw-items-center tw-border tw-border-main tw-rounded-md tw-p-8">
      <span>Lineage data is not available for deleted entities.</span>
    </div>
  );
};

const dagreGraph = new dagre.graphlib.Graph();
dagreGraph.setDefaultEdgeLabel(() => ({}));

export const getLayoutedElements = (
  elements: CustomElement,
  direction = EntityLineageDirection.LEFT_RIGHT
) => {
  const { node, edge } = elements;
  const isHorizontal = direction === EntityLineageDirection.LEFT_RIGHT;
  dagreGraph.setGraph({ rankdir: direction });

  node.forEach((el) => {
    dagreGraph.setNode(el.id, {
      width: NODE_WIDTH,
      height: NODE_HEIGHT,
    });
  });

  edge.forEach((el) => {
    dagreGraph.setEdge(el.source, el.target);
  });

  dagre.layout(dagreGraph);

  const uNode = node.map((el) => {
    const nodeWithPosition = dagreGraph.node(el.id);
    el.targetPosition = isHorizontal ? Position.Left : Position.Top;
    el.sourcePosition = isHorizontal ? Position.Right : Position.Bottom;
    el.position = {
      x: nodeWithPosition.x - NODE_WIDTH / 2,
      y: nodeWithPosition.y - NODE_HEIGHT / 2,
    };

    return el;
  });

  return { node: uNode, edge };
};

export const getModalBodyText = (selectedEdge: SelectedEdge) => {
  const { data, source, target } = selectedEdge;
  const { isColumnLineage } = data as CustomEdgeData;
  let sourceEntity = '';
  let targetEntity = '';
  const sourceFQN = isColumnLineage
    ? data?.sourceHandle
    : source.fullyQualifiedName;

  const targetFQN = isColumnLineage
    ? data?.targetHandle
    : target.fullyQualifiedName;

  const fqnPart = isColumnLineage ? FqnPart.Column : FqnPart.Table;

  if (source.type === EntityType.TABLE) {
    sourceEntity = getPartialNameFromTableFQN(sourceFQN || '', [fqnPart]);
  } else {
    sourceEntity = getPartialNameFromFQN(sourceFQN || '', ['database']);
  }

  if (target.type === EntityType.TABLE) {
    targetEntity = getPartialNameFromTableFQN(targetFQN || '', [fqnPart]);
  } else {
    targetEntity = getPartialNameFromFQN(targetFQN || '', ['database']);
  }

  return `Are you sure you want to remove the edge between "${
    source.displayName ? source.displayName : sourceEntity
  } and ${target.displayName ? target.displayName : targetEntity}"?`;
};

export const getUniqueFlowElements = (elements: CustomFlow[]) => {
  const flag: { [x: string]: boolean } = {};
  const uniqueElements: CustomFlow[] = [];

  elements.forEach((elem) => {
    if (!flag[elem.id]) {
      flag[elem.id] = true;
      uniqueElements.push(elem);
    }
  });

  return uniqueElements;
};

/**
 *
 * @param onClick - callback
 * @returns - Button element with attach callback
 */
export const getNodeRemoveButton = (onClick: () => void) => {
  return (
    <button
      className="tw-absolute tw--top-3.5 tw--right-3 tw-cursor-pointer tw-z-9999 tw-bg-body-hover tw-rounded-full"
      onClick={() => onClick()}>
      <SVGIcons alt="times-circle" icon="icon-times-circle" width="16px" />
    </button>
  );
};

export const getSelectedEdgeArr = (
  edgeArr: EntityLineageEdge[],
  edgeData: EdgeData
) => {
  return edgeArr.filter(
    (edge) =>
      !edgeArr.find(
        () =>
          edgeData.fromId === edge.fromEntity && edgeData.toId === edge.toEntity
      )
  );
};

/**
 * Finds the upstream/downstream edge based on selected edge
 * @param edgeArr edge[]
 * @param data selected edge
 * @returns edge
 */

export const findUpstreamDownStreamEdge = (
  edgeArr: EntityLineageEdge[] | undefined,
  data: SelectedEdge
) => {
  return edgeArr?.find(
    (edge) =>
      edge.fromEntity === data.source.id && edge.toEntity === data.target.id
  );
};

/**
 * Get upstream/downstream column lineage array
 * @param lineageDetails LineageDetails
 * @param data SelectedEdge
 * @returns Updated LineageDetails
 */

export const getUpStreamDownStreamColumnLineageArr = (
  lineageDetails: LineageDetails,
  data: SelectedEdge
) => {
  const columnsLineage = lineageDetails.columnsLineage.reduce((col, curr) => {
    if (curr.toColumn === data.data?.targetHandle) {
      const newCol = {
        ...curr,
        fromColumns:
          curr.fromColumns?.filter(
            (column) => column !== data.data?.sourceHandle
          ) || [],
      };
      if (newCol.fromColumns?.length) {
        return [...col, newCol];
      } else {
        return col;
      }
    }

    return [...col, curr];
  }, [] as ColumnLineage[]);

  return {
    sqlQuery: lineageDetails.sqlQuery || '',
    columnsLineage: columnsLineage,
  };
};

/**
 * Get updated EntityLineageEdge Array based on selected data
 * @param edge EntityLineageEdge[]
 * @param data SelectedEdge
 * @param lineageDetails updated LineageDetails
 * @returns updated EntityLineageEdge[]
 */
export const getUpdatedUpstreamDownStreamEdgeArr = (
  edge: EntityLineageEdge[],
  data: SelectedEdge,
  lineageDetails: LineageDetails
) => {
  return edge.map((down) => {
    if (
      down.fromEntity === data.source.id &&
      down.toEntity === data.target.id
    ) {
      return {
        ...down,
        lineageDetails: lineageDetails,
      };
    }

    return down;
  });
};

/**
 * Get array of the removed node
 * @param nodes All the node
 * @param edge selected edge
 * @param entity main entity
 * @param selectedEntity selected entity
 * @returns details of removed node
 */
export const getRemovedNodeData = (
  nodes: EntityReference[],
  edge: Edge,
  entity: EntityReference,
  selectedEntity: EntityReference
) => {
  let targetNode = nodes.find((node) => edge.target?.includes(node.id));
  let sourceNode = nodes.find((node) => edge.source?.includes(node.id));
  const selectedNode = isEmpty(selectedEntity) ? entity : selectedEntity;

  if (isUndefined(targetNode)) {
    targetNode = selectedNode;
  }
  if (isUndefined(sourceNode)) {
    sourceNode = selectedNode;
  }

  return {
    id: edge.id,
    source: sourceNode,
    target: targetNode,
  };
};

/**
 * Get source/target edge based on query string
 * @param edge upstream/downstream edge array
 * @param queryStr source/target string
 * @param id main entity id
 * @returns source/target edge
 */
const getSourceTargetNode = (
  edge: EntityLineageEdge[],
  queryStr: string | null,
  id: string
) => {
  return edge.find(
    (d) =>
      (queryStr?.includes(d.fromEntity) || queryStr?.includes(d.toEntity)) &&
      queryStr !== id
  );
};

export const getEdgeType = (
  updatedLineageData: EntityLineage,
  params: Edge | Connection
) => {
  const { entity } = updatedLineageData;
  const { target, source } = params;
  const sourceDownstreamNode = getSourceTargetNode(
    updatedLineageData.downstreamEdges || [],
    source,
    entity.id
  );

  const sourceUpStreamNode = getSourceTargetNode(
    updatedLineageData.upstreamEdges || [],
    source,
    entity.id
  );

  const targetDownStreamNode = getSourceTargetNode(
    updatedLineageData.downstreamEdges || [],
    target,
    entity.id
  );

  const targetUpStreamNode = getSourceTargetNode(
    updatedLineageData.upstreamEdges || [],
    target,
    entity.id
  );

  const isUpstream =
    (!isNil(sourceUpStreamNode) && !isNil(targetDownStreamNode)) ||
    !isNil(sourceUpStreamNode) ||
    !isNil(targetUpStreamNode) ||
    target?.includes(entity.id);

  const isDownstream =
    (!isNil(sourceDownstreamNode) && !isNil(targetUpStreamNode)) ||
    !isNil(sourceDownstreamNode) ||
    !isNil(targetDownStreamNode) ||
    source?.includes(entity.id);

  if (isUpstream) {
    return EdgeTypeEnum.UP_STREAM;
  } else if (isDownstream) {
    return EdgeTypeEnum.DOWN_STREAM;
  }

  return EdgeTypeEnum.NO_STREAM;
};

/**
 * Get updated Edge with lineageDetails
 * @param edges Array of Edge
 * @param params new connected edge
 * @param lineageDetails updated lineage details
 * @returns updated edge array
 */
export const getUpdatedEdge = (
  edges: EntityLineageEdge[],
  params: Edge | Connection,
  lineageDetails: LineageDetails | undefined
) => {
  const updatedEdge: EntityLineageEdge[] = [];
  const { target, source } = params;
  edges.forEach((edge) => {
    if (edge.fromEntity === source && edge.toEntity === target) {
      updatedEdge.push({
        ...edge,
        lineageDetails: lineageDetails,
      });
    } else {
      updatedEdge.push(edge);
    }
  });

  return updatedEdge;
};

// create new edge
export const createNewEdge = (
  params: Edge | Connection,
  isEditMode: boolean,
  sourceNodeType: string,
  targetNodeType: string,
  isColumnLineage: boolean,
  onEdgeClick: (
    evt: React.MouseEvent<HTMLButtonElement>,
    data: CustomEdgeData
  ) => void
) => {
  const { target, source, sourceHandle, targetHandle } = params;
  let data: Edge = {
    id: `edge-${source}-${target}`,
    source: `${source}`,
    target: `${target}`,
    type: isEditMode ? 'buttonedge' : 'custom',
    style: { strokeWidth: '2px' },
    markerEnd: {
      type: MarkerType.ArrowClosed,
    },
    data: {
      id: `edge-${source}-${target}`,
      source: source,
      target: target,
      sourceType: sourceNodeType,
      targetType: targetNodeType,
      isColumnLineage: isColumnLineage,
      onEdgeClick,
    },
  };

  if (isColumnLineage) {
    data = {
      ...data,
      id: `column-${sourceHandle}-${targetHandle}-edge-${source}-${target}`,
      sourceHandle: sourceHandle,
      targetHandle: targetHandle,
      style: undefined,
      data: {
        ...data.data,
        id: `column-${sourceHandle}-${targetHandle}-edge-${source}-${target}`,
        sourceHandle: sourceHandle,
        targetHandle: targetHandle,
      },
    };
  }

  return data;
};

export const getLoadingStatusValue = (
  defaultState: string | JSX.Element,
  loading: boolean,
  status: LoadingState
) => {
  if (loading) {
    return <Loader size="small" type="white" />;
  } else if (status === 'success') {
    return <FontAwesomeIcon className="text-white" icon="check" />;
  } else {
    return defaultState;
  }
};
