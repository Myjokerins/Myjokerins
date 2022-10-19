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
import { compare, Operation } from 'fast-json-patch';
import { isEmpty, isUndefined, omitBy } from 'lodash';
import { observer } from 'mobx-react';
import {
  EntityFieldThreadCount,
  EntityTags,
  LeafNodes,
  LineagePos,
  LoadingNodeState,
} from 'Models';
import React, { useEffect, useState } from 'react';
import { useHistory, useParams } from 'react-router-dom';
import AppState from '../../AppState';
import {
  getAllFeeds,
  postFeedById,
  postThread,
} from '../../axiosAPIs/feedsAPI';
import { getLineageByFQN } from '../../axiosAPIs/lineageAPI';
import { addLineage, deleteLineageEdge } from '../../axiosAPIs/miscAPI';
import {
  addFollower,
  getPipelineByFqn,
  patchPipelineDetails,
  removeFollower,
} from '../../axiosAPIs/pipelineAPI';
import { getServiceByFQN } from '../../axiosAPIs/serviceAPI';
import ErrorPlaceHolder from '../../components/common/error-with-placeholder/ErrorPlaceHolder';
import { TitleBreadcrumbProps } from '../../components/common/title-breadcrumb/title-breadcrumb.interface';
import {
  Edge,
  EdgeData,
} from '../../components/EntityLineage/EntityLineage.interface';
import Loader from '../../components/Loader/Loader';
import { usePermissionProvider } from '../../components/PermissionProvider/PermissionProvider';
import { ResourceEntity } from '../../components/PermissionProvider/PermissionProvider.interface';
import PipelineDetails from '../../components/PipelineDetails/PipelineDetails.component';
import {
  getPipelineDetailsPath,
  getServiceDetailsPath,
  getVersionPath,
} from '../../constants/constants';
import { NO_PERMISSION_TO_VIEW } from '../../constants/HelperTextUtil';
import { EntityType, TabSpecificField } from '../../enums/entity.enum';
import { FeedFilter } from '../../enums/mydata.enum';
import { ServiceCategory } from '../../enums/service.enum';
import { CreateThread } from '../../generated/api/feed/createThread';
import { Pipeline, Task } from '../../generated/entity/data/pipeline';
import { Post, Thread, ThreadType } from '../../generated/entity/feed/thread';
import { Connection } from '../../generated/entity/services/dashboardService';
import { EntityLineage } from '../../generated/type/entityLineage';
import { EntityReference } from '../../generated/type/entityReference';
import { Paging } from '../../generated/type/paging';
import { TagLabel } from '../../generated/type/tagLabel';
import jsonData from '../../jsons/en';
import {
  addToRecentViewed,
  getCurrentUserId,
  getEntityMissingError,
  getEntityName,
  getFeedCounts,
} from '../../utils/CommonUtils';
import { getEntityFeedLink, getEntityLineage } from '../../utils/EntityUtils';
import { deletePost, updateThreadData } from '../../utils/FeedUtils';
import { DEFAULT_ENTITY_PERMISSION } from '../../utils/PermissionsUtils';
import {
  defaultFields,
  getCurrentPipelineTab,
  pipelineDetailsTabs,
} from '../../utils/PipelineDetailsUtils';
import { serviceTypeLogo } from '../../utils/ServiceUtils';
import { getTagsWithoutTier, getTierTags } from '../../utils/TableUtils';
import { showErrorToast } from '../../utils/ToastUtils';

const PipelineDetailsPage = () => {
  const USERId = getCurrentUserId();
  const history = useHistory();

  const { pipelineFQN, tab } = useParams() as Record<string, string>;
  const [pipelineDetails, setPipelineDetails] = useState<Pipeline>(
    {} as Pipeline
  );
  const [pipelineId, setPipelineId] = useState<string>('');
  const [isLoading, setLoading] = useState<boolean>(true);
  const [isLineageLoading, setIsLineageLoading] = useState<boolean>(false);
  const [description, setDescription] = useState<string>('');
  const [followers, setFollowers] = useState<Array<EntityReference>>([]);
  const [owner, setOwner] = useState<EntityReference>();
  const [tier, setTier] = useState<TagLabel>();
  const [tags, setTags] = useState<Array<EntityTags>>([]);
  const [activeTab, setActiveTab] = useState<number>(
    getCurrentPipelineTab(tab)
  );
  const [tasks, setTasks] = useState<Task[]>([]);
  const [pipelineUrl, setPipelineUrl] = useState<string>('');
  const [displayName, setDisplayName] = useState<string>('');
  const [serviceType, setServiceType] = useState<string>('');
  const [slashedPipelineName, setSlashedPipelineName] = useState<
    TitleBreadcrumbProps['titleLinks']
  >([]);
  const [isNodeLoading, setNodeLoading] = useState<LoadingNodeState>({
    id: undefined,
    state: false,
  });

  const [entityLineage, setEntityLineage] = useState<EntityLineage>(
    {} as EntityLineage
  );
  const [leafNodes, setLeafNodes] = useState<LeafNodes>({} as LeafNodes);

  const [currentVersion, setCurrentVersion] = useState<string>();
  const [deleted, setDeleted] = useState<boolean>(false);
  const [isError, setIsError] = useState(false);

  const [entityThread, setEntityThread] = useState<Thread[]>([]);
  const [isentityThreadLoading, setIsentityThreadLoading] =
    useState<boolean>(false);
  const [feedCount, setFeedCount] = useState<number>(0);
  const [entityFieldThreadCount, setEntityFieldThreadCount] = useState<
    EntityFieldThreadCount[]
  >([]);
  const [paging, setPaging] = useState<Paging>({} as Paging);

  const [pipeLineStatus, setPipelineStatus] =
    useState<Pipeline['pipelineStatus']>();
  const [entityFieldTaskCount, setEntityFieldTaskCount] = useState<
    EntityFieldThreadCount[]
  >([]);

  const [pipelinePermissions, setPipelinePermissions] = useState(
    DEFAULT_ENTITY_PERMISSION
  );

  const { getEntityPermissionByFqn } = usePermissionProvider();

  const fetchResourcePermission = async (entityFqn: string) => {
    setLoading(true);
    try {
      const entityPermission = await getEntityPermissionByFqn(
        ResourceEntity.PIPELINE,
        entityFqn
      );
      setPipelinePermissions(entityPermission);
    } catch (error) {
      showErrorToast(
        jsonData['api-error-messages']['fetch-entity-permissions-error']
      );
    } finally {
      setLoading(false);
    }
  };

  const activeTabHandler = (tabValue: number) => {
    const currentTabIndex = tabValue - 1;
    if (pipelineDetailsTabs[currentTabIndex].path !== tab) {
      setActiveTab(
        getCurrentPipelineTab(pipelineDetailsTabs[currentTabIndex].path)
      );
      history.push({
        pathname: getPipelineDetailsPath(
          pipelineFQN,
          pipelineDetailsTabs[currentTabIndex].path
        ),
      });
    }
  };

  const getEntityFeedCount = () => {
    getFeedCounts(
      EntityType.PIPELINE,
      pipelineFQN,
      setEntityFieldThreadCount,
      setEntityFieldTaskCount,
      setFeedCount
    );
  };

  const saveUpdatedPipelineData = (updatedData: Pipeline) => {
    const jsonPatch = compare(
      omitBy(pipelineDetails, isUndefined),
      updatedData
    );

    return patchPipelineDetails(pipelineId, jsonPatch);
  };

  const getLineageData = () => {
    setIsLineageLoading(true);
    getLineageByFQN(pipelineFQN, EntityType.PIPELINE)
      .then((res) => {
        if (res) {
          setEntityLineage(res);
        } else {
          throw jsonData['api-error-messages']['unexpected-server-response'];
        }
      })
      .catch((err: AxiosError) => {
        showErrorToast(
          err,
          jsonData['api-error-messages']['fetch-lineage-error']
        );
      })
      .finally(() => {
        setIsLineageLoading(false);
      });
  };

  const getFeedData = (
    after?: string,
    feedFilter?: FeedFilter,
    threadType?: ThreadType
  ) => {
    setIsentityThreadLoading(true);
    getAllFeeds(
      getEntityFeedLink(EntityType.PIPELINE, pipelineFQN),
      after,
      threadType,
      feedFilter,
      undefined,
      USERId
    )
      .then((res) => {
        const { data, paging: pagingObj } = res;
        if (data) {
          setPaging(pagingObj);
          setEntityThread((prevData) => [...prevData, ...data]);
        } else {
          showErrorToast(
            jsonData['api-error-messages']['fetch-entity-feed-error']
          );
        }
      })
      .catch((err: AxiosError) => {
        showErrorToast(
          err,
          jsonData['api-error-messages']['fetch-entity-feed-error']
        );
      })
      .finally(() => setIsentityThreadLoading(false));
  };

  const handleFeedFetchFromFeedList = (
    after?: string,
    filterType?: FeedFilter,
    type?: ThreadType
  ) => {
    !after && setEntityThread([]);
    getFeedData(after, filterType, type);
  };

  const fetchServiceDetails = (type: string, fqn: string) => {
    return new Promise<string>((resolve, reject) => {
      getServiceByFQN(type + 's', fqn, ['owner'])
        .then((resService) => {
          if (resService) {
            const hostPort =
              (resService.connection?.config as Connection)?.hostPort || '';
            resolve(hostPort);
          } else {
            throw null;
          }
        })
        .catch((err: AxiosError) => {
          showErrorToast(
            err,
            jsonData['api-error-messages']['fetch-pipeline-details-error']
          );
          reject(err);
        });
    });
  };

  const fetchPipelineDetail = (pipelineFQN: string) => {
    setLoading(true);
    getPipelineByFqn(pipelineFQN, defaultFields)
      .then((res) => {
        if (res) {
          const {
            id,
            deleted,
            description,
            followers = [],
            fullyQualifiedName,
            service,
            serviceType,
            tags = [],
            owner,
            displayName,
            name,
            tasks,
            pipelineUrl = '',
            pipelineStatus,
            version,
          } = res;
          setDisplayName(displayName || name);
          setPipelineDetails(res);
          setCurrentVersion(version + '');
          setPipelineId(id);
          setDescription(description ?? '');
          setFollowers(followers);
          setOwner(owner);
          setTier(getTierTags(tags));
          setTags(getTagsWithoutTier(tags));
          setServiceType(serviceType ?? '');
          setDeleted(Boolean(deleted));
          const serviceName = service.name ?? '';
          setSlashedPipelineName([
            {
              name: serviceName,
              url: serviceName
                ? getServiceDetailsPath(
                    serviceName,
                    ServiceCategory.PIPELINE_SERVICES
                  )
                : '',
              imgSrc: serviceType ? serviceTypeLogo(serviceType) : undefined,
            },
            {
              name: getEntityName(res),
              url: '',
              activeTitle: true,
            },
          ]);

          addToRecentViewed({
            displayName: getEntityName(res),
            entityType: EntityType.PIPELINE,
            fqn: fullyQualifiedName ?? '',
            serviceType: serviceType,
            timestamp: 0,
            id: id,
          });

          setPipelineUrl(pipelineUrl);
          setTasks(tasks || []);

          setPipelineStatus(pipelineStatus as Pipeline['pipelineStatus']);

          fetchServiceDetails(service.type, service.name ?? '')
            .then((hostPort: string) => {
              setPipelineUrl(hostPort + pipelineUrl);
              const updatedTasks = ((tasks || []) as Task[]).map((task) => ({
                ...task,
                taskUrl: hostPort + task.taskUrl,
              }));
              setTasks(updatedTasks);
              setLoading(false);
            })
            .catch((err: AxiosError) => {
              throw err;
            });
        } else {
          setIsError(true);

          throw jsonData['api-error-messages']['unexpected-server-response'];
        }
      })
      .catch((err: AxiosError) => {
        if (err.response?.status === 404) {
          setIsError(true);
        } else {
          showErrorToast(
            err,
            jsonData['api-error-messages']['fetch-pipeline-details-error']
          );
        }
      })
      .finally(() => {
        setLoading(false);
      });
  };

  const fetchTabSpecificData = (tabField = '') => {
    switch (tabField) {
      case TabSpecificField.LINEAGE: {
        if (!deleted) {
          if (isEmpty(entityLineage)) {
            getLineageData();
          }

          break;
        }

        break;
      }
      case TabSpecificField.ACTIVITY_FEED: {
        getFeedData();

        break;
      }

      default:
        break;
    }
  };

  const followPipeline = () => {
    addFollower(pipelineId, USERId)
      .then((res) => {
        if (res) {
          const { newValue } = res.changeDescription.fieldsAdded[0];

          setFollowers([...followers, ...newValue]);
        } else {
          throw jsonData['api-error-messages']['unexpected-server-response'];
        }
      })
      .catch((err: AxiosError) => {
        showErrorToast(
          err,
          jsonData['api-error-messages']['update-entity-follow-error']
        );
      });
  };

  const unfollowPipeline = () => {
    removeFollower(pipelineId, USERId)
      .then((res) => {
        if (res) {
          const { oldValue } = res.changeDescription.fieldsDeleted[0];

          setFollowers(
            followers.filter((follower) => follower.id !== oldValue[0].id)
          );
        } else {
          throw jsonData['api-error-messages']['unexpected-server-response'];
        }
      })
      .catch((err: AxiosError) => {
        showErrorToast(
          err,
          jsonData['api-error-messages']['update-entity-unfollow-error']
        );
      });
  };

  const descriptionUpdateHandler = async (updatedPipeline: Pipeline) => {
    try {
      const response = await saveUpdatedPipelineData(updatedPipeline);
      if (response) {
        const { description = '', version } = response;
        setCurrentVersion(version + '');
        setPipelineDetails(response);
        setDescription(description);
        getEntityFeedCount();
      } else {
        throw jsonData['api-error-messages']['unexpected-server-response'];
      }
    } catch (error) {
      showErrorToast(error as AxiosError);
    }
  };

  const settingsUpdateHandler = (updatedPipeline: Pipeline): Promise<void> => {
    return new Promise<void>((resolve, reject) => {
      saveUpdatedPipelineData(updatedPipeline)
        .then((res) => {
          if (res) {
            setPipelineDetails({ ...res, tags: res.tags ?? [] });
            setCurrentVersion(res.version + '');
            setOwner(res.owner);
            setTier(getTierTags(res.tags ?? []));
            getEntityFeedCount();
            resolve();
          } else {
            throw jsonData['api-error-messages']['unexpected-server-response'];
          }
        })
        .catch((err: AxiosError) => {
          showErrorToast(
            err,
            jsonData['api-error-messages']['update-entity-error']
          );
          reject();
        });
    });
  };

  const onTagUpdate = (updatedPipeline: Pipeline) => {
    saveUpdatedPipelineData(updatedPipeline)
      .then((res) => {
        if (res) {
          setPipelineDetails(res);
          setTier(getTierTags(res.tags ?? []));
          setCurrentVersion(res.version + '');
          setTags(getTagsWithoutTier(res.tags ?? []));
          getEntityFeedCount();
        } else {
          throw jsonData['api-error-messages']['unexpected-server-response'];
        }
      })
      .catch((err: AxiosError) => {
        showErrorToast(
          err,
          jsonData['api-error-messages']['update-tags-error']
        );
      });
  };

  const onTaskUpdate = async (jsonPatch: Array<Operation>) => {
    try {
      const response = await patchPipelineDetails(pipelineId, jsonPatch);

      if (response) {
        setTasks(response.tasks || []);
        getEntityFeedCount();
      } else {
        throw jsonData['api-error-messages']['unexpected-server-response'];
      }
    } catch (error) {
      showErrorToast(error as AxiosError);
    }
  };

  const setLeafNode = (val: EntityLineage, pos: LineagePos) => {
    if (pos === 'to' && val.downstreamEdges?.length === 0) {
      setLeafNodes((prev) => ({
        ...prev,
        downStreamNode: [...(prev.downStreamNode ?? []), val.entity.id],
      }));
    }
    if (pos === 'from' && val.upstreamEdges?.length === 0) {
      setLeafNodes((prev) => ({
        ...prev,
        upStreamNode: [...(prev.upStreamNode ?? []), val.entity.id],
      }));
    }
  };

  const entityLineageHandler = (lineage: EntityLineage) => {
    setEntityLineage(lineage);
  };

  const loadNodeHandler = (node: EntityReference, pos: LineagePos) => {
    setNodeLoading({ id: node.id, state: true });
    getLineageByFQN(node.fullyQualifiedName ?? '', node.type)
      .then((res) => {
        if (res) {
          setLeafNode(res, pos);
          setEntityLineage(getEntityLineage(entityLineage, res, pos));
        } else {
          showErrorToast(
            jsonData['api-error-messages']['fetch-lineage-node-error']
          );
        }
        setTimeout(() => {
          setNodeLoading((prev) => ({ ...prev, state: false }));
        }, 500);
      })
      .catch((err: AxiosError) => {
        showErrorToast(
          err,
          jsonData['api-error-messages']['fetch-lineage-node-error']
        );
      });
  };

  const versionHandler = () => {
    history.push(
      getVersionPath(EntityType.PIPELINE, pipelineFQN, currentVersion as string)
    );
  };

  const addLineageHandler = (edge: Edge): Promise<void> => {
    return new Promise<void>((resolve, reject) => {
      addLineage(edge)
        .then(() => {
          resolve();
        })
        .catch((err: AxiosError) => {
          showErrorToast(
            err,
            jsonData['api-error-messages']['add-lineage-error']
          );
          reject();
        });
    });
  };

  const removeLineageHandler = (data: EdgeData) => {
    deleteLineageEdge(
      data.fromEntity,
      data.fromId,
      data.toEntity,
      data.toId
    ).catch((err: AxiosError) => {
      showErrorToast(
        err,
        jsonData['api-error-messages']['delete-lineage-error']
      );
    });
  };

  const postFeedHandler = (value: string, id: string) => {
    const currentUser = AppState.userDetails?.name ?? AppState.users[0]?.name;

    const data = {
      message: value,
      from: currentUser,
    } as Post;
    postFeedById(id, data)
      .then((res) => {
        if (res) {
          const { id, posts } = res;
          setEntityThread((pre) => {
            return pre.map((thread) => {
              if (thread.id === id) {
                return { ...res, posts: posts?.slice(-3) };
              } else {
                return thread;
              }
            });
          });
          getEntityFeedCount();
        } else {
          throw jsonData['api-error-messages']['unexpected-server-response'];
        }
      })
      .catch((err: AxiosError) => {
        showErrorToast(err, jsonData['api-error-messages']['add-feed-error']);
      });
  };

  const createThread = (data: CreateThread) => {
    postThread(data)
      .then((res) => {
        if (res) {
          setEntityThread((pre) => [...pre, res]);
          getEntityFeedCount();
        } else {
          showErrorToast(
            jsonData['api-error-messages']['unexpected-server-response']
          );
        }
      })
      .catch((err: AxiosError) => {
        showErrorToast(
          err,
          jsonData['api-error-messages']['create-conversation-error']
        );
      });
  };

  const deletePostHandler = (
    threadId: string,
    postId: string,
    isThread: boolean
  ) => {
    deletePost(threadId, postId, isThread, setEntityThread);
  };

  const updateThreadHandler = (
    threadId: string,
    postId: string,
    isThread: boolean,
    data: Operation[]
  ) => {
    updateThreadData(threadId, postId, isThread, data, setEntityThread);
  };

  const handleExtentionUpdate = async (updatedPipeline: Pipeline) => {
    try {
      const data = await saveUpdatedPipelineData(updatedPipeline);

      if (data) {
        const { version, owner: ownerValue, tags = [] } = data;
        setCurrentVersion(version + '');
        setPipelineDetails(data);
        setOwner(ownerValue);
        setTier(getTierTags(tags));
      } else {
        throw jsonData['api-error-messages']['update-entity-error'];
      }
    } catch (error) {
      showErrorToast(
        error as AxiosError,
        jsonData['api-error-messages']['update-entity-error']
      );
    }
  };

  useEffect(() => {
    fetchTabSpecificData(pipelineDetailsTabs[activeTab - 1].field);
  }, [activeTab]);

  useEffect(() => {
    if (pipelinePermissions.ViewAll || pipelinePermissions.ViewBasic) {
      fetchPipelineDetail(pipelineFQN);
      setEntityLineage({} as EntityLineage);
      getEntityFeedCount();
    }
  }, [pipelinePermissions, pipelineFQN]);

  useEffect(() => {
    fetchResourcePermission(pipelineFQN);
  }, [pipelineFQN]);

  useEffect(() => {
    if (pipelineDetailsTabs[activeTab - 1].path !== tab) {
      setActiveTab(getCurrentPipelineTab(tab));
    }
    setEntityThread([]);
  }, [tab]);

  return (
    <>
      {isLoading ? (
        <Loader />
      ) : isError ? (
        <ErrorPlaceHolder>
          {getEntityMissingError('pipeline', pipelineFQN)}
        </ErrorPlaceHolder>
      ) : (
        <>
          {pipelinePermissions.ViewAll || pipelinePermissions.ViewBasic ? (
            <PipelineDetails
              activeTab={activeTab}
              addLineageHandler={addLineageHandler}
              createThread={createThread}
              deletePostHandler={deletePostHandler}
              deleted={deleted}
              description={description}
              descriptionUpdateHandler={descriptionUpdateHandler}
              entityFieldTaskCount={entityFieldTaskCount}
              entityFieldThreadCount={entityFieldThreadCount}
              entityLineage={entityLineage}
              entityLineageHandler={entityLineageHandler}
              entityName={displayName}
              entityThread={entityThread}
              feedCount={feedCount}
              fetchFeedHandler={handleFeedFetchFromFeedList}
              followPipelineHandler={followPipeline}
              followers={followers}
              isLineageLoading={isLineageLoading}
              isNodeLoading={isNodeLoading}
              isentityThreadLoading={isentityThreadLoading}
              lineageLeafNodes={leafNodes}
              loadNodeHandler={loadNodeHandler}
              owner={owner as EntityReference}
              paging={paging}
              pipelineDetails={pipelineDetails}
              pipelineFQN={pipelineFQN}
              pipelineStatus={pipeLineStatus}
              pipelineTags={tags}
              pipelineUrl={pipelineUrl}
              postFeedHandler={postFeedHandler}
              removeLineageHandler={removeLineageHandler}
              serviceType={serviceType}
              setActiveTabHandler={activeTabHandler}
              settingsUpdateHandler={settingsUpdateHandler}
              slashedPipelineName={slashedPipelineName}
              tagUpdateHandler={onTagUpdate}
              taskUpdateHandler={onTaskUpdate}
              tasks={tasks}
              tier={tier as TagLabel}
              unfollowPipelineHandler={unfollowPipeline}
              updateThreadHandler={updateThreadHandler}
              version={currentVersion as string}
              versionHandler={versionHandler}
              onExtensionUpdate={handleExtentionUpdate}
            />
          ) : (
            <ErrorPlaceHolder>{NO_PERMISSION_TO_VIEW}</ErrorPlaceHolder>
          )}
        </>
      )}
    </>
  );
};

export default observer(PipelineDetailsPage);
