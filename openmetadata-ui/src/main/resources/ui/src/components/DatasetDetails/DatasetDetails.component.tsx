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

import { Col, Row } from 'antd';
import { AxiosError } from 'axios';
import classNames from 'classnames';
import { isEmpty, isEqual, isNil, isUndefined } from 'lodash';
import { ColumnJoins, EntityTags, ExtraInfo } from 'Models';
import React, { RefObject, useCallback, useEffect, useState } from 'react';
import { useHistory } from 'react-router-dom';
import { restoreTable } from '../../axiosAPIs/tableAPI';
import { FQN_SEPARATOR_CHAR } from '../../constants/char.constants';
import { ROUTES } from '../../constants/constants';
import { EntityField } from '../../constants/feed.constants';
import { observerOptions } from '../../constants/Mydata.constants';
import { CSMode } from '../../enums/codemirror.enum';
import { EntityType, FqnPart } from '../../enums/entity.enum';
import { OwnerType } from '../../enums/user.enum';
import { CreateTable } from '../../generated/api/data/createTable';
import {
  JoinedWith,
  Table,
  TableJoins,
  TypeUsedToReturnUsageDetailsOfAnEntity,
} from '../../generated/entity/data/table';
import { ThreadType } from '../../generated/entity/feed/thread';
import { EntityReference } from '../../generated/type/entityReference';
import { Paging } from '../../generated/type/paging';
import { LabelType, State } from '../../generated/type/tagLabel';
import { useInfiniteScroll } from '../../hooks/useInfiniteScroll';
import jsonData from '../../jsons/en';
import {
  getCurrentUserId,
  getEntityId,
  getEntityName,
  getEntityPlaceHolder,
  getOwnerValue,
  getPartialNameFromTableFQN,
  getTableFQNFromColumnFQN,
} from '../../utils/CommonUtils';
import { getEntityFeedLink } from '../../utils/EntityUtils';
import { getDefaultValue } from '../../utils/FeedElementUtils';
import { getEntityFieldThreadCounts } from '../../utils/FeedUtils';
import { DEFAULT_ENTITY_PERMISSION } from '../../utils/PermissionsUtils';
import { getTagsWithoutTier, getUsagePercentile } from '../../utils/TableUtils';
import { showErrorToast, showSuccessToast } from '../../utils/ToastUtils';
import ActivityFeedList from '../ActivityFeed/ActivityFeedList/ActivityFeedList';
import ActivityThreadPanel from '../ActivityFeed/ActivityThreadPanel/ActivityThreadPanel';
import { CustomPropertyTable } from '../common/CustomPropertyTable/CustomPropertyTable';
import { CustomPropertyProps } from '../common/CustomPropertyTable/CustomPropertyTable.interface';
import Description from '../common/description/Description';
import EntityPageInfo from '../common/entityPageInfo/EntityPageInfo';
import ErrorPlaceHolder from '../common/error-with-placeholder/ErrorPlaceHolder';
import TabsPane from '../common/TabsPane/TabsPane';
import PageContainer from '../containers/PageContainer';
import EntityLineageComponent from '../EntityLineage/EntityLineage.component';
import FrequentlyJoinedTables from '../FrequentlyJoinedTables/FrequentlyJoinedTables.component';
import Loader from '../Loader/Loader';
import RequestDescriptionModal from '../Modals/RequestDescriptionModal/RequestDescriptionModal';
import { usePermissionProvider } from '../PermissionProvider/PermissionProvider';
import {
  OperationPermission,
  ResourceEntity,
} from '../PermissionProvider/PermissionProvider.interface';
import SampleDataTable, {
  SampleColumns,
} from '../SampleDataTable/SampleDataTable.component';
import SchemaEditor from '../schema-editor/SchemaEditor';
import SchemaTab from '../SchemaTab/SchemaTab.component';
import TableProfilerGraph from '../TableProfiler/TableProfilerGraph.component';
import TableProfilerV1 from '../TableProfiler/TableProfilerV1';
import TableQueries from '../TableQueries/TableQueries';
import { DatasetDetailsProps } from './DatasetDetails.interface';

const DatasetDetails: React.FC<DatasetDetailsProps> = ({
  entityName,
  datasetFQN,
  activeTab,
  setActiveTabHandler,
  owner,
  description,
  tableProfile,
  columns,
  tier,
  sampleData,
  entityLineage,
  followTableHandler,
  unfollowTableHandler,
  followers,
  slashedTableName,
  tableTags,
  tableDetails,
  descriptionUpdateHandler,
  columnsUpdateHandler,
  settingsUpdateHandler,
  usageSummary,
  joins,
  tableType,
  version,
  versionHandler,
  loadNodeHandler,
  lineageLeafNodes,
  isNodeLoading,
  dataModel,
  deleted,
  tagUpdateHandler,
  addLineageHandler,
  removeLineageHandler,
  entityLineageHandler,
  isLineageLoading,
  isSampleDataLoading,
  isQueriesLoading,
  tableQueries,
  entityThread,
  isentityThreadLoading,
  postFeedHandler,
  feedCount,
  entityFieldThreadCount,
  createThread,
  deletePostHandler,
  paging,
  fetchFeedHandler,
  handleExtentionUpdate,
  updateThreadHandler,
  entityFieldTaskCount,
}: DatasetDetailsProps) => {
  const history = useHistory();
  const [isEdit, setIsEdit] = useState(false);
  const [followersCount, setFollowersCount] = useState(0);
  const [isFollowing, setIsFollowing] = useState(false);
  const [usage, setUsage] = useState('');
  const [weeklyUsageCount, setWeeklyUsageCount] = useState('');
  const [tableJoinData, setTableJoinData] = useState<TableJoins>({
    startDate: new Date(),
    dayCount: 0,
    columnJoins: [],
    directTableJoins: [],
  });

  const [threadLink, setThreadLink] = useState<string>('');
  const [threadType, setThreadType] = useState<ThreadType>(
    ThreadType.Conversation
  );
  const [selectedField, setSelectedField] = useState<string>('');

  const [elementRef, isInView] = useInfiniteScroll(observerOptions);

  const [tablePermissions, setTablePermissions] = useState<OperationPermission>(
    DEFAULT_ENTITY_PERMISSION
  );

  const { getEntityPermission } = usePermissionProvider();

  const fetchResourcePermission = useCallback(async () => {
    try {
      const tablePermission = await getEntityPermission(
        ResourceEntity.TABLE,
        tableDetails.id
      );

      setTablePermissions(tablePermission);
    } catch (error) {
      showErrorToast(
        jsonData['api-error-messages']['fetch-entity-permissions-error']
      );
    }
  }, [tableDetails.id, getEntityPermission, setTablePermissions]);

  useEffect(() => {
    if (tableDetails.id) {
      fetchResourcePermission();
    }
  }, [tableDetails.id]);

  const onEntityFieldSelect = (value: string) => {
    setSelectedField(value);
  };
  const closeRequestModal = () => {
    setSelectedField('');
  };

  const setUsageDetails = (
    usageSummary: TypeUsedToReturnUsageDetailsOfAnEntity
  ) => {
    if (!isNil(usageSummary?.weeklyStats?.percentileRank)) {
      const percentile = getUsagePercentile(
        usageSummary?.weeklyStats?.percentileRank || 0,
        true
      );
      setUsage(percentile);
    } else {
      setUsage('--');
    }
    setWeeklyUsageCount(
      usageSummary?.weeklyStats?.count.toLocaleString() || '--'
    );
  };

  const setFollowersData = (followers: Array<EntityReference>) => {
    setIsFollowing(
      followers.some(({ id }: { id: string }) => id === getCurrentUserId())
    );
    setFollowersCount(followers?.length);
  };
  const tabs = [
    {
      name: 'Schema',
      icon: {
        alt: 'schema',
        name: 'icon-schema',
        title: 'Schema',
        selectedName: 'icon-schemacolor',
      },
      isProtected: false,
      position: 1,
    },
    {
      name: 'Activity Feeds & Tasks',
      icon: {
        alt: 'activity_feed',
        name: 'activity_feed',
        title: 'Activity Feed',
        selectedName: 'activity-feed-color',
      },
      isProtected: false,
      position: 2,
      count: feedCount,
    },
    {
      name: 'Sample Data',
      icon: {
        alt: 'sample_data',
        name: 'sample-data',
        title: 'Sample Data',
        selectedName: 'sample-data-color',
      },
      isProtected: false,
      isHidden: !(
        tablePermissions.ViewAll ||
        tablePermissions.ViewBasic ||
        tablePermissions.ViewSampleData
      ),
      position: 3,
    },
    {
      name: 'Queries',
      icon: {
        alt: 'table_queries',
        name: 'table_queries',
        title: 'Table Queries',
        selectedName: '',
      },
      isProtected: false,
      isHidden: !(
        tablePermissions.ViewAll ||
        tablePermissions.ViewBasic ||
        tablePermissions.ViewQueries
      ),
      position: 4,
    },
    {
      name: 'Profiler & Data Quality',
      icon: {
        alt: 'profiler',
        name: 'icon-profiler',
        title: 'Profiler',
        selectedName: 'icon-profilercolor',
      },
      isProtected: false,
      isHidden: !(
        tablePermissions.ViewAll ||
        tablePermissions.ViewBasic ||
        tablePermissions.ViewDataProfile ||
        tablePermissions.ViewTests
      ),
      position: 5,
    },
    {
      name: 'Lineage',
      icon: {
        alt: 'lineage',
        name: 'icon-lineage',
        title: 'Lineage',
        selectedName: 'icon-lineagecolor',
      },
      isProtected: false,
      position: 7,
    },
    {
      name: 'DBT',
      icon: {
        alt: 'dbt-model',
        name: 'dbtmodel-light-grey',
        title: 'DBT',
        selectedName: 'dbtmodel-primery',
      },
      isProtected: false,
      isHidden: !dataModel?.sql,
      position: 8,
    },
    {
      name: 'Custom Properties',
      isProtected: false,
      position: 9,
    },
  ];

  const getFrequentlyJoinedWithTables = (): Array<
    JoinedWith & { name: string }
  > => {
    const tableFQNGrouping = [
      ...(tableJoinData.columnJoins?.flatMap(
        (cjs) =>
          cjs.joinedWith?.map<JoinedWith>((jw) => ({
            fullyQualifiedName: getTableFQNFromColumnFQN(jw.fullyQualifiedName),
            joinCount: jw.joinCount,
          })) ?? []
      ) ?? []),
      ...(tableJoinData.directTableJoins ?? []),
    ].reduce(
      (result, jw) => ({
        ...result,
        [jw.fullyQualifiedName]:
          (result[jw.fullyQualifiedName] ?? 0) + jw.joinCount,
      }),
      {} as Record<string, number>
    );

    return Object.entries(tableFQNGrouping)
      .map<JoinedWith & { name: string }>(
        ([fullyQualifiedName, joinCount]) => ({
          fullyQualifiedName,
          joinCount,
          name: getPartialNameFromTableFQN(
            fullyQualifiedName,
            [FqnPart.Database, FqnPart.Table],
            FQN_SEPARATOR_CHAR
          ),
        })
      )
      .sort((a, b) => b.joinCount - a.joinCount);
  };

  const prepareTableRowInfo = () => {
    const rowData =
      ([
        {
          date: new Date(tableProfile?.timestamp || 0),
          value: tableProfile?.rowCount ?? 0,
        },
      ] as Array<{
        date: Date;
        value: number;
      }>) ?? [];

    if (!isUndefined(tableProfile)) {
      return (
        <div className="tw-flex">
          {rowData.length > 1 && (
            <TableProfilerGraph
              className="tw--mt-4"
              data={rowData}
              height={38}
              toolTipPos={{ x: 20, y: -30 }}
            />
          )}
          <span
            className={classNames({
              'tw--ml-6': rowData.length > 1,
            })}>{`${tableProfile.rowCount || 0} rows`}</span>
        </div>
      );
    } else {
      return '';
    }
  };

  const extraInfo: Array<ExtraInfo> = [
    {
      key: 'Owner',
      value: getOwnerValue(owner),
      placeholderText: getEntityPlaceHolder(
        getEntityName(owner),
        owner?.deleted
      ),
      id: getEntityId(owner),
      isEntityDetails: true,
      isLink: true,
      openInNewTab: false,
      profileName: owner?.type === OwnerType.USER ? owner?.name : undefined,
    },
    {
      key: 'Tier',
      value: tier?.tagFQN ? tier.tagFQN.split(FQN_SEPARATOR_CHAR)[1] : '',
    },
    { key: 'Type', value: `${tableType}`, showLabel: true },
    { value: usage },
    { value: `${weeklyUsageCount} Queries` },
    {
      key: 'Columns',
      value:
        tableProfile && tableProfile?.columnCount
          ? `${tableProfile.columnCount} Columns`
          : columns.length
          ? `${columns.length} Columns`
          : '',
    },
    {
      key: 'Rows',
      value: prepareTableRowInfo(),
    },
  ];

  const onDescriptionEdit = (): void => {
    setIsEdit(true);
  };
  const onCancel = () => {
    setIsEdit(false);
  };

  const onDescriptionUpdate = async (updatedHTML: string) => {
    if (description !== updatedHTML) {
      const updatedTableDetails = {
        ...tableDetails,
        description: updatedHTML,
      };
      await descriptionUpdateHandler(updatedTableDetails);
      setIsEdit(false);
    } else {
      setIsEdit(false);
    }
  };

  const onColumnsUpdate = async (updateColumns: Table['columns']) => {
    if (!isEqual(columns, updateColumns)) {
      const updatedTableDetails = {
        ...tableDetails,
        columns: updateColumns,
      };
      await columnsUpdateHandler(updatedTableDetails);
    }
  };

  const onOwnerUpdate = (newOwner?: Table['owner']) => {
    if (newOwner) {
      const updatedTableDetails = {
        ...tableDetails,
        owner: {
          ...tableDetails.owner,
          ...newOwner,
        },
      };
      settingsUpdateHandler(updatedTableDetails);
    }
  };

  const onOwnerRemove = () => {
    if (tableDetails) {
      const updatedTableDetails = {
        ...tableDetails,
        owner: undefined,
      };
      settingsUpdateHandler(updatedTableDetails);
    }
  };

  const onTierUpdate = (newTier?: string) => {
    if (newTier) {
      const tierTag: Table['tags'] = newTier
        ? [
            ...getTagsWithoutTier(tableDetails.tags as Array<EntityTags>),
            {
              tagFQN: newTier,
              labelType: LabelType.Manual,
              state: State.Confirmed,
            },
          ]
        : tableDetails.tags;
      const updatedTableDetails = {
        ...tableDetails,
        tags: tierTag,
      };

      return settingsUpdateHandler(updatedTableDetails);
    } else {
      return Promise.reject();
    }
  };

  const onRemoveTier = () => {
    if (tableDetails) {
      const updatedTableDetails = {
        ...tableDetails,
        tags: undefined,
      };
      settingsUpdateHandler(updatedTableDetails);
    }
  };

  /**
   * Formulates updated tags and updates table entity data for API call
   * @param selectedTags
   */
  const onTagUpdate = (selectedTags?: Array<EntityTags>) => {
    if (selectedTags) {
      const updatedTags = [...(tier ? [tier] : []), ...selectedTags];
      const updatedTable = { ...tableDetails, tags: updatedTags };
      tagUpdateHandler(updatedTable);
    }
  };

  const followTable = () => {
    if (isFollowing) {
      setFollowersCount((preValu) => preValu - 1);
      setIsFollowing(false);
      unfollowTableHandler();
    } else {
      setFollowersCount((preValu) => preValu + 1);
      setIsFollowing(true);
      followTableHandler();
    }
  };

  const handleRestoreTable = async () => {
    const data: CreateTable = {
      columns: tableDetails.columns,
      databaseSchema: tableDetails.databaseSchema as EntityReference,
      description: tableDetails.description,
      displayName: tableDetails.displayName,
      extension: tableDetails.extension,
      name: tableDetails.name,
      owner: tableDetails.owner,
      tableConstraints: tableDetails.tableConstraints,
      tags: tableDetails.tags,
      tablePartition: tableDetails.tablePartition,
      tableProfilerConfig: tableDetails.tableProfilerConfig,
      tableType: tableDetails.tableType,
      viewDefinition: tableDetails.viewDefinition,
    };

    try {
      await restoreTable(data);
      showSuccessToast(
        jsonData['api-success-messages']['restore-table-success'],
        2000
      );
      history.push('/explore');
    } catch (error) {
      showErrorToast(
        error as AxiosError,
        jsonData['api-error-messages']['restore-table-error']
      );
    }
  };

  const getSampleDataWithType = () => {
    const updatedColumns = sampleData?.columns?.map((column) => {
      const matchedColumn = columns.find((col) => col.name === column);

      if (matchedColumn) {
        return {
          name: matchedColumn.name,
          dataType: matchedColumn.dataType,
        };
      } else {
        return {
          name: column,
          dataType: '',
        };
      }
    });

    return {
      columns: updatedColumns as SampleColumns[] | undefined,
      rows: sampleData?.rows,
    };
  };

  const onThreadLinkSelect = (link: string, threadType?: ThreadType) => {
    setThreadLink(link);
    if (threadType) {
      setThreadType(threadType);
    }
  };

  const onThreadPanelClose = () => {
    setThreadLink('');
  };

  const getLoader = () => {
    return isentityThreadLoading ? <Loader /> : null;
  };

  const fetchMoreThread = (
    isElementInView: boolean,
    pagingObj: Paging,
    isLoading: boolean
  ) => {
    if (isElementInView && pagingObj?.after && !isLoading) {
      fetchFeedHandler(pagingObj.after);
    }
  };

  useEffect(() => {
    setFollowersData(followers);
  }, [followers]);
  useEffect(() => {
    setUsageDetails(usageSummary);
  }, [usageSummary]);

  useEffect(() => {
    setTableJoinData(joins);
  }, [joins]);

  useEffect(() => {
    fetchMoreThread(isInView as boolean, paging, isentityThreadLoading);
  }, [paging, isentityThreadLoading, isInView]);

  const handleFeedFilterChange = useCallback(
    (feedType, threadType) => {
      fetchFeedHandler(paging.after, feedType, threadType);
    },
    [paging]
  );

  return (
    <PageContainer>
      <div className="tw-px-6 tw-w-full tw-h-full tw-flex tw-flex-col">
        <EntityPageInfo
          canDelete={tablePermissions.Delete}
          currentOwner={tableDetails.owner}
          deleted={deleted}
          entityFieldTasks={getEntityFieldThreadCounts(
            EntityField.TAGS,
            entityFieldTaskCount
          )}
          entityFieldThreads={getEntityFieldThreadCounts(
            EntityField.TAGS,
            entityFieldThreadCount
          )}
          entityFqn={datasetFQN}
          entityId={tableDetails.id}
          entityName={entityName}
          entityType={EntityType.TABLE}
          extraInfo={extraInfo}
          followHandler={followTable}
          followers={followersCount}
          followersList={followers}
          isFollowing={isFollowing}
          isTagEditable={tablePermissions.EditAll || tablePermissions.EditTags}
          removeOwner={
            tablePermissions.EditAll || tablePermissions.EditOwner
              ? onOwnerRemove
              : undefined
          }
          removeTier={
            tablePermissions.EditAll || tablePermissions.EditTier
              ? onRemoveTier
              : undefined
          }
          restoreEntity={handleRestoreTable}
          tags={tableTags}
          tagsHandler={onTagUpdate}
          tier={tier}
          titleLinks={slashedTableName}
          updateOwner={
            tablePermissions.EditAll || tablePermissions.EditOwner
              ? onOwnerUpdate
              : undefined
          }
          updateTier={
            tablePermissions.EditAll || tablePermissions.EditTier
              ? onTierUpdate
              : undefined
          }
          version={version}
          versionHandler={versionHandler}
          onThreadLinkSelect={onThreadLinkSelect}
        />

        <div className="tw-mt-4 tw-flex tw-flex-col tw-flex-grow">
          <TabsPane
            activeTab={activeTab}
            className="tw-flex-initial"
            setActiveTab={setActiveTabHandler}
            tabs={tabs}
          />
          <div className="tw-flex-grow tw-flex tw-flex-col tw--mx-6 tw-px-7 tw-py-4">
            <div className="tw-bg-white tw-flex-grow tw-p-4 tw-shadow tw-rounded-md">
              {activeTab === 1 && (
                <div
                  className="tw-grid tw-grid-cols-4 tw-gap-4 tw-w-full"
                  id="schemaDetails">
                  <div className="tw-col-span-3 tw--ml-5">
                    <Description
                      description={description}
                      entityFieldTasks={getEntityFieldThreadCounts(
                        EntityField.DESCRIPTION,
                        entityFieldTaskCount
                      )}
                      entityFieldThreads={getEntityFieldThreadCounts(
                        EntityField.DESCRIPTION,
                        entityFieldThreadCount
                      )}
                      entityFqn={datasetFQN}
                      entityName={entityName}
                      entityType={EntityType.TABLE}
                      hasEditAccess={
                        tablePermissions.EditAll ||
                        tablePermissions.EditDescription
                      }
                      isEdit={isEdit}
                      isReadOnly={deleted}
                      owner={owner}
                      onCancel={onCancel}
                      onDescriptionEdit={onDescriptionEdit}
                      onDescriptionUpdate={onDescriptionUpdate}
                      onEntityFieldSelect={onEntityFieldSelect}
                      onThreadLinkSelect={onThreadLinkSelect}
                    />
                  </div>
                  <div className="tw-col-span-1 tw-border tw-border-main tw-rounded-md">
                    <FrequentlyJoinedTables
                      header="Frequently Joined Tables"
                      tableList={getFrequentlyJoinedWithTables()}
                    />
                  </div>
                  <div className="tw-col-span-full">
                    <SchemaTab
                      columnName={getPartialNameFromTableFQN(
                        datasetFQN,
                        [FqnPart['Column']],
                        FQN_SEPARATOR_CHAR
                      )}
                      columns={columns}
                      entityFieldTasks={getEntityFieldThreadCounts(
                        EntityField.COLUMNS,
                        entityFieldTaskCount
                      )}
                      entityFieldThreads={getEntityFieldThreadCounts(
                        EntityField.COLUMNS,
                        entityFieldThreadCount
                      )}
                      entityFqn={datasetFQN}
                      hasDescriptionEditAccess={
                        tablePermissions.EditAll ||
                        tablePermissions.EditDescription
                      }
                      hasTagEditAccess={
                        tablePermissions.EditAll || tablePermissions.EditTags
                      }
                      isReadOnly={deleted}
                      joins={tableJoinData.columnJoins as ColumnJoins[]}
                      sampleData={sampleData}
                      tableConstraints={tableDetails.tableConstraints}
                      onEntityFieldSelect={onEntityFieldSelect}
                      onThreadLinkSelect={onThreadLinkSelect}
                      onUpdate={onColumnsUpdate}
                    />
                  </div>
                </div>
              )}
              {activeTab === 2 && (
                <div
                  className="tw-py-4 tw-px-7 tw-grid tw-grid-cols-3 entity-feed-list tw--mx-7 tw--my-4"
                  id="activityfeed">
                  <div />
                  <ActivityFeedList
                    isEntityFeed
                    withSidePanel
                    className=""
                    deletePostHandler={deletePostHandler}
                    entityName={entityName}
                    feedList={entityThread}
                    postFeedHandler={postFeedHandler}
                    updateThreadHandler={updateThreadHandler}
                    onFeedFiltersUpdate={handleFeedFilterChange}
                  />
                  <div />
                </div>
              )}
              {activeTab === 3 && (
                <div id="sampleDataDetails">
                  <SampleDataTable
                    isLoading={isSampleDataLoading}
                    sampleData={getSampleDataWithType()}
                  />
                </div>
              )}
              {activeTab === 4 && (
                <Row className="tw-p-2" id="tablequeries">
                  {!isEmpty(tableQueries) || isQueriesLoading ? (
                    <Col offset={3} span={18}>
                      <TableQueries
                        isLoading={isQueriesLoading}
                        queries={tableQueries}
                      />
                    </Col>
                  ) : (
                    <Col
                      className="tw-flex tw-justify-center tw-font-medium tw-items-center tw-p-8 tw-col-span-3"
                      span={24}>
                      <div data-testid="no-queries">
                        <ErrorPlaceHolder heading="queries" />
                      </div>
                    </Col>
                  )}
                </Row>
              )}
              {activeTab === 5 && (
                <TableProfilerV1
                  permissions={tablePermissions}
                  table={tableDetails}
                />
              )}

              {activeTab === 7 && (
                <div
                  className={classNames(
                    'tw-px-2',
                    location.pathname.includes(ROUTES.TOUR)
                      ? 'tw-h-70vh'
                      : 'tw-h-full'
                  )}
                  id="lineageDetails">
                  <EntityLineageComponent
                    addLineageHandler={addLineageHandler}
                    deleted={deleted}
                    entityLineage={entityLineage}
                    entityLineageHandler={entityLineageHandler}
                    entityType={EntityType.TABLE}
                    hasEditAccess={
                      tablePermissions.EditAll || tablePermissions.EditLineage
                    }
                    isLoading={isLineageLoading}
                    isNodeLoading={isNodeLoading}
                    lineageLeafNodes={lineageLeafNodes}
                    loadNodeHandler={loadNodeHandler}
                    removeLineageHandler={removeLineageHandler}
                  />
                </div>
              )}
              {activeTab === 8 && Boolean(dataModel?.sql) && (
                <div className="tw-border tw-border-main tw-rounded-md tw-py-4 tw-h-full cm-h-full">
                  <SchemaEditor
                    className="tw-h-full"
                    mode={{ name: CSMode.SQL }}
                    value={dataModel?.sql || ''}
                  />
                </div>
              )}
              {activeTab === 9 && (
                <CustomPropertyTable
                  entityDetails={
                    tableDetails as CustomPropertyProps['entityDetails']
                  }
                  entityType={EntityType.TABLE}
                  handleExtentionUpdate={handleExtentionUpdate}
                />
              )}
              <div
                data-testid="observer-element"
                id="observer-element"
                ref={elementRef as RefObject<HTMLDivElement>}>
                {getLoader()}
              </div>
            </div>
          </div>
          {threadLink ? (
            <ActivityThreadPanel
              createThread={createThread}
              deletePostHandler={deletePostHandler}
              open={Boolean(threadLink)}
              postFeedHandler={postFeedHandler}
              threadLink={threadLink}
              threadType={threadType}
              updateThreadHandler={updateThreadHandler}
              onCancel={onThreadPanelClose}
            />
          ) : null}
          {selectedField ? (
            <RequestDescriptionModal
              createThread={createThread}
              defaultValue={getDefaultValue(owner)}
              header="Request description"
              threadLink={getEntityFeedLink(
                EntityType.TABLE,
                datasetFQN,
                selectedField
              )}
              onCancel={closeRequestModal}
            />
          ) : null}
        </div>
      </div>
    </PageContainer>
  );
};

export default DatasetDetails;
