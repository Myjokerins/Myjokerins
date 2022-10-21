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

import { AxiosError } from 'axios';
import { compare } from 'fast-json-patch';
import { isEmpty } from 'lodash';
import { EntityTags, ExtraInfo } from 'Models';
import React, { RefObject, useCallback, useEffect, useState } from 'react';
import { useHistory } from 'react-router-dom';
import { restorePipeline } from '../../axiosAPIs/pipelineAPI';
import { FQN_SEPARATOR_CHAR } from '../../constants/char.constants';
import { EntityField } from '../../constants/feed.constants';
import { observerOptions } from '../../constants/Mydata.constants';
import { EntityType } from '../../enums/entity.enum';
import { OwnerType } from '../../enums/user.enum';
import { CreatePipeline } from '../../generated/api/data/createPipeline';
import {
  Pipeline,
  PipelineStatus,
  Task,
} from '../../generated/entity/data/pipeline';
import { ThreadType } from '../../generated/entity/feed/thread';
import { EntityReference } from '../../generated/type/entityReference';
import { Paging } from '../../generated/type/paging';
import { LabelType, State } from '../../generated/type/tagLabel';
import { useInfiniteScroll } from '../../hooks/useInfiniteScroll';
import jsonData from '../../jsons/en';
import {
  getCurrentUserId,
  getEntityName,
  getEntityPlaceHolder,
  getOwnerValue,
} from '../../utils/CommonUtils';
import { getEntityFeedLink } from '../../utils/EntityUtils';
import { getDefaultValue } from '../../utils/FeedElementUtils';
import { getEntityFieldThreadCounts } from '../../utils/FeedUtils';
import { DEFAULT_ENTITY_PERMISSION } from '../../utils/PermissionsUtils';
import { getTagsWithoutTier } from '../../utils/TableUtils';
import { showErrorToast, showSuccessToast } from '../../utils/ToastUtils';
import ActivityFeedList from '../ActivityFeed/ActivityFeedList/ActivityFeedList';
import ActivityThreadPanel from '../ActivityFeed/ActivityThreadPanel/ActivityThreadPanel';
import { CustomPropertyTable } from '../common/CustomPropertyTable/CustomPropertyTable';
import { CustomPropertyProps } from '../common/CustomPropertyTable/CustomPropertyTable.interface';
import Description from '../common/description/Description';
import EntityPageInfo from '../common/entityPageInfo/EntityPageInfo';
import TabsPane from '../common/TabsPane/TabsPane';
import PageContainer from '../containers/PageContainer';
import EntityLineageComponent from '../EntityLineage/EntityLineage.component';
import Loader from '../Loader/Loader';
import { ModalWithMarkdownEditor } from '../Modals/ModalWithMarkdownEditor/ModalWithMarkdownEditor';
import RequestDescriptionModal from '../Modals/RequestDescriptionModal/RequestDescriptionModal';
import { usePermissionProvider } from '../PermissionProvider/PermissionProvider';
import { ResourceEntity } from '../PermissionProvider/PermissionProvider.interface';
import PipelineStatusList from '../PipelineStatusList/PipelineStatusList.component';
import TasksDAGView from '../TasksDAGView/TasksDAGView';
import { PipeLineDetailsProp } from './PipelineDetails.interface';

const PipelineDetails = ({
  entityName,
  owner,
  tier,
  slashedPipelineName,
  pipelineTags,
  activeTab,
  pipelineUrl,
  pipelineDetails,
  serviceType,
  setActiveTabHandler,
  description,
  descriptionUpdateHandler,
  entityLineage,
  followers,
  followPipelineHandler,
  unfollowPipelineHandler,
  tagUpdateHandler,
  settingsUpdateHandler,
  tasks,
  taskUpdateHandler,
  loadNodeHandler,
  lineageLeafNodes,
  isNodeLoading,
  version,
  deleted,
  versionHandler,
  addLineageHandler,
  removeLineageHandler,
  entityLineageHandler,
  isLineageLoading,
  isentityThreadLoading,
  entityThread,
  postFeedHandler,
  feedCount,
  entityFieldThreadCount,
  createThread,
  pipelineFQN,
  deletePostHandler,
  paging,
  fetchFeedHandler,
  pipelineStatus,
  updateThreadHandler,
  entityFieldTaskCount,
  onExtensionUpdate,
}: PipeLineDetailsProp) => {
  const history = useHistory();
  const [isEdit, setIsEdit] = useState(false);
  const [followersCount, setFollowersCount] = useState(0);
  const [isFollowing, setIsFollowing] = useState(false);
  const [editTask, setEditTask] = useState<{
    task: Task;
    index: number;
  }>();

  const [threadLink, setThreadLink] = useState<string>('');

  const [selectedField, setSelectedField] = useState<string>('');

  const [elementRef, isInView] = useInfiniteScroll(observerOptions);
  const [selectedExecution, setSelectedExecution] = useState<PipelineStatus>(
    () => {
      if (pipelineStatus) {
        return pipelineStatus;
      } else {
        return {} as PipelineStatus;
      }
    }
  );
  const [threadType, setThreadType] = useState<ThreadType>(
    ThreadType.Conversation
  );

  const [pipelinePermissions, setPipelinePermissions] = useState(
    DEFAULT_ENTITY_PERMISSION
  );

  const { getEntityPermission } = usePermissionProvider();

  const fetchResourcePermission = useCallback(async () => {
    try {
      const entityPermission = await getEntityPermission(
        ResourceEntity.PIPELINE,
        pipelineDetails.id
      );
      setPipelinePermissions(entityPermission);
    } catch (error) {
      showErrorToast(
        jsonData['api-error-messages']['fetch-entity-permissions-error']
      );
    }
  }, [pipelineDetails.id, getEntityPermission, setPipelinePermissions]);

  useEffect(() => {
    if (pipelineDetails.id) {
      fetchResourcePermission();
    }
  }, [pipelineDetails.id]);

  const onEntityFieldSelect = (value: string) => {
    setSelectedField(value);
  };
  const closeRequestModal = () => {
    setSelectedField('');
  };

  const setFollowersData = (followers: Array<EntityReference>) => {
    setIsFollowing(
      followers.some(({ id }: { id: string }) => id === getCurrentUserId())
    );
    setFollowersCount(followers?.length);
  };
  const tabs = [
    {
      name: 'Details',
      icon: {
        alt: 'schema',
        name: 'icon-schema',
        title: 'Details',
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
      name: 'Lineage',
      icon: {
        alt: 'lineage',
        name: 'icon-lineage',
        title: 'Lineage',
        selectedName: 'icon-lineagecolor',
      },
      isProtected: false,
      position: 3,
    },
    {
      name: 'Custom Properties',
      isProtected: false,
      position: 4,
    },
  ];

  const extraInfo: Array<ExtraInfo> = [
    {
      key: 'Owner',
      value: getOwnerValue(owner),
      placeholderText: getEntityPlaceHolder(
        getEntityName(owner),
        owner?.deleted
      ),
      isLink: true,
      openInNewTab: false,
      profileName: owner?.type === OwnerType.USER ? owner?.name : undefined,
    },
    {
      key: 'Tier',
      value: tier?.tagFQN ? tier.tagFQN.split(FQN_SEPARATOR_CHAR)[1] : '',
    },
    {
      key: `${serviceType} Url`,
      value: pipelineUrl,
      placeholderText: entityName,
      isLink: true,
      openInNewTab: true,
    },
  ];

  const onTaskUpdate = async (taskDescription: string) => {
    if (editTask) {
      const updatedTasks = [...(pipelineDetails.tasks || [])];

      const updatedTask = {
        ...editTask.task,
        description: taskDescription,
      };
      updatedTasks[editTask.index] = updatedTask;

      const updatedPipeline = { ...pipelineDetails, tasks: updatedTasks };
      const jsonPatch = compare(pipelineDetails, updatedPipeline);
      await taskUpdateHandler(jsonPatch);
      setEditTask(undefined);
    } else {
      setEditTask(undefined);
    }
  };

  const closeEditTaskModal = (): void => {
    setEditTask(undefined);
  };

  const onOwnerUpdate = (newOwner?: Pipeline['owner']) => {
    if (newOwner) {
      const updatedPipelineDetails = {
        ...pipelineDetails,
        owner: newOwner
          ? { ...pipelineDetails.owner, ...newOwner }
          : pipelineDetails.owner,
      };
      settingsUpdateHandler(updatedPipelineDetails);
    }
  };

  const onOwnerRemove = () => {
    if (pipelineDetails) {
      const updatedPipelineDetails = {
        ...pipelineDetails,
        owner: undefined,
      };
      settingsUpdateHandler(updatedPipelineDetails);
    }
  };

  const onTierRemove = () => {
    if (pipelineDetails) {
      const updatedPipelineDetails = {
        ...pipelineDetails,
        tags: undefined,
      };
      settingsUpdateHandler(updatedPipelineDetails);
    }
  };

  const onTierUpdate = (newTier?: string) => {
    if (newTier) {
      const tierTag: Pipeline['tags'] = newTier
        ? [
            ...getTagsWithoutTier(pipelineDetails.tags as Array<EntityTags>),
            {
              tagFQN: newTier,
              labelType: LabelType.Manual,
              state: State.Confirmed,
            },
          ]
        : pipelineDetails.tags;
      const updatedPipelineDetails = {
        ...pipelineDetails,
        tags: tierTag,
      };
      settingsUpdateHandler(updatedPipelineDetails);
    }
  };

  const onTagUpdate = (selectedTags?: Array<EntityTags>) => {
    if (selectedTags) {
      const updatedTags = [...(tier ? [tier] : []), ...selectedTags];
      const updatedPipeline = { ...pipelineDetails, tags: updatedTags };
      tagUpdateHandler(updatedPipeline);
    }
  };

  const handleRestorePipeline = async () => {
    const data: CreatePipeline = {
      concurrency: pipelineDetails.concurrency,
      pipelineUrl: pipelineDetails.pipelineUrl,
      description: pipelineDetails.description,
      displayName: pipelineDetails.displayName,
      extension: pipelineDetails.extension,
      name: pipelineDetails.name,
      owner: pipelineDetails.owner,
      service: pipelineDetails.service,
      tags: pipelineDetails.tags,
      pipelineLocation: pipelineDetails.pipelineLocation,
      startDate: pipelineDetails.startDate,
    };

    try {
      await restorePipeline(data);
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

  const onDescriptionEdit = (): void => {
    setIsEdit(true);
  };
  const onCancel = () => {
    setIsEdit(false);
  };

  const onDescriptionUpdate = async (updatedHTML: string) => {
    if (description !== updatedHTML) {
      const updatedPipelineDetails = {
        ...pipelineDetails,
        description: updatedHTML,
      };
      await descriptionUpdateHandler(updatedPipelineDetails);
      setIsEdit(false);
    } else {
      setIsEdit(false);
    }
  };

  const followPipeline = () => {
    if (isFollowing) {
      setFollowersCount((preValu) => preValu - 1);
      setIsFollowing(false);
      unfollowPipelineHandler();
    } else {
      setFollowersCount((preValu) => preValu + 1);
      setIsFollowing(true);
      followPipelineHandler();
    }
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
    fetchMoreThread(isInView as boolean, paging, isentityThreadLoading);
  }, [paging, isentityThreadLoading, isInView]);

  const handleFeedFilterChange = useCallback(
    (feedFilter, threadType) => {
      fetchFeedHandler(paging.after, feedFilter, threadType);
    },
    [paging]
  );

  return (
    <PageContainer>
      <div className="tw-px-6 tw-w-full tw-h-full tw-flex tw-flex-col">
        <EntityPageInfo
          canDelete={pipelinePermissions.Delete}
          currentOwner={pipelineDetails.owner}
          deleted={deleted}
          entityFieldTasks={getEntityFieldThreadCounts(
            EntityField.TAGS,
            entityFieldTaskCount
          )}
          entityFieldThreads={getEntityFieldThreadCounts(
            EntityField.TAGS,
            entityFieldThreadCount
          )}
          entityFqn={pipelineFQN}
          entityId={pipelineDetails.id}
          entityName={entityName}
          entityType={EntityType.PIPELINE}
          extraInfo={extraInfo}
          followHandler={followPipeline}
          followers={followersCount}
          followersList={followers}
          isFollowing={isFollowing}
          isTagEditable={
            pipelinePermissions.EditAll || pipelinePermissions.EditTags
          }
          removeOwner={
            pipelinePermissions.EditAll || pipelinePermissions.EditOwner
              ? onOwnerRemove
              : undefined
          }
          removeTier={
            pipelinePermissions.EditAll || pipelinePermissions.EditTier
              ? onTierRemove
              : undefined
          }
          restoreEntity={handleRestorePipeline}
          tags={pipelineTags}
          tagsHandler={onTagUpdate}
          tier={tier}
          titleLinks={slashedPipelineName}
          updateOwner={
            pipelinePermissions.EditAll || pipelinePermissions.EditOwner
              ? onOwnerUpdate
              : undefined
          }
          updateTier={
            pipelinePermissions.EditAll || pipelinePermissions.EditTier
              ? onTierUpdate
              : undefined
          }
          version={version}
          versionHandler={versionHandler}
          onThreadLinkSelect={onThreadLinkSelect}
        />
        <div className="tw-mt-4 tw-flex tw-flex-col tw-flex-grow tw-w-full">
          <TabsPane
            activeTab={activeTab}
            setActiveTab={setActiveTabHandler}
            tabs={tabs}
          />

          <div className="tw-flex-grow tw-flex tw-flex-col tw--mx-6 tw-px-7 tw-py-4">
            <div className="tw-flex-grow tw-flex tw-flex-col tw-bg-white tw-p-4 tw-shadow tw-rounded-md tw-w-full">
              {activeTab === 1 && (
                <>
                  <div className="tw-grid tw-grid-cols-4 tw-gap-4 tw-w-full">
                    <div className="tw-col-span-full tw--ml-5">
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
                        entityFqn={pipelineFQN}
                        entityName={entityName}
                        entityType={EntityType.PIPELINE}
                        hasEditAccess={
                          pipelinePermissions.EditAll ||
                          pipelinePermissions.EditDescription
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
                  </div>
                  <hr className="tw-my-3" />
                  <div
                    className="tw-flex-grow tw-w-full tw-h-full"
                    style={{ height: 'calc(100% - 250px)' }}>
                    {!isEmpty(tasks) ? (
                      <TasksDAGView
                        selectedExec={selectedExecution}
                        tasks={tasks}
                      />
                    ) : (
                      <div
                        className="tw-mt-4 tw-ml-4 tw-flex tw-justify-center tw-font-medium tw-items-center tw-border tw-border-main tw-rounded-md tw-p-8"
                        data-testid="no-tasks-data">
                        <span>No task data is available</span>
                      </div>
                    )}
                  </div>
                  <hr className="tw-my-3" />
                  <div className="tw-px-6">
                    <PipelineStatusList
                      pipelineFQN={pipelineFQN}
                      pipelineStatus={pipelineStatus}
                      selectedExec={selectedExecution}
                      onSelectExecution={(exec) => {
                        setSelectedExecution(exec);
                      }}
                    />
                  </div>
                </>
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
                <div className="tw-h-full tw-px-3">
                  <EntityLineageComponent
                    addLineageHandler={addLineageHandler}
                    deleted={deleted}
                    entityLineage={entityLineage}
                    entityLineageHandler={entityLineageHandler}
                    entityType={EntityType.PIPELINE}
                    hasEditAccess={
                      pipelinePermissions.EditAll ||
                      pipelinePermissions.EditLineage
                    }
                    isLoading={isLineageLoading}
                    isNodeLoading={isNodeLoading}
                    lineageLeafNodes={lineageLeafNodes}
                    loadNodeHandler={loadNodeHandler}
                    removeLineageHandler={removeLineageHandler}
                  />
                </div>
              )}
              {activeTab === 4 && (
                <CustomPropertyTable
                  entityDetails={
                    pipelineDetails as CustomPropertyProps['entityDetails']
                  }
                  entityType={EntityType.PIPELINE}
                  handleExtentionUpdate={onExtensionUpdate}
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
        </div>
      </div>
      {editTask && (
        <ModalWithMarkdownEditor
          header={`Edit Task: "${editTask.task.displayName}"`}
          placeholder="Enter Task Description"
          value={editTask.task.description || ''}
          onCancel={closeEditTaskModal}
          onSave={onTaskUpdate}
        />
      )}
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
          defaultValue={getDefaultValue(owner as EntityReference)}
          header="Request description"
          threadLink={getEntityFeedLink(
            EntityType.PIPELINE,
            pipelineFQN,
            selectedField
          )}
          onCancel={closeRequestModal}
        />
      ) : null}
    </PageContainer>
  );
};

export default PipelineDetails;
