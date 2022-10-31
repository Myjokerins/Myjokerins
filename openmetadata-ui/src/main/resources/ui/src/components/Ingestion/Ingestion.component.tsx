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

import { faExclamationCircle } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { Button, Tooltip, Typography } from 'antd';
import classNames from 'classnames';
import cronstrue from 'cronstrue';
import { useTranslation } from 'react-i18next';

import { capitalize, isNil, lowerCase, startCase } from 'lodash';
import React, { Fragment, useCallback, useState } from 'react';
import { useHistory } from 'react-router-dom';
import { PAGE_SIZE } from '../../constants/constants';
import { WORKFLOWS_METADATA_DOCS } from '../../constants/docs.constants';
import { NO_PERMISSION_TO_VIEW } from '../../constants/HelperTextUtil';
import { Connection } from '../../generated/entity/services/databaseService';
import {
  IngestionPipeline,
  PipelineType,
} from '../../generated/entity/services/ingestionPipelines/ingestionPipeline';
import { getLoadingStatus, isEven } from '../../utils/CommonUtils';
import {
  getAddIngestionPath,
  getEditIngestionPath,
  getLogsViewerPath,
} from '../../utils/RouterUtils';
import { dropdownIcon as DropdownIcon } from '../../utils/svgconstant';
import SVGIcons, { Icons } from '../../utils/SvgUtils';
import { showSuccessToast } from '../../utils/ToastUtils';
import ErrorPlaceHolder from '../common/error-with-placeholder/ErrorPlaceHolder';
import NextPrevious from '../common/next-previous/NextPrevious';
import PopOver from '../common/popover/PopOver';
import Searchbar from '../common/searchbar/Searchbar';
import DropDownList from '../dropdown/DropDownList';
import Loader from '../Loader/Loader';
import EntityDeleteModal from '../Modals/EntityDeleteModal/EntityDeleteModal';
import KillIngestionModal from '../Modals/KillIngestionPipelineModal/KillIngestionPipelineModal';
import { IngestionProps } from './ingestion.interface';

const Ingestion: React.FC<IngestionProps> = ({
  airflowEndpoint,
  serviceName,
  serviceCategory,
  serviceDetails,
  ingestionList,
  isRequiredDetailsAvailable,
  deleteIngestion,
  triggerIngestion,
  deployIngestion,
  paging,
  pagingHandler,
  handleEnableDisableIngestion,
  currrentPage,
  onIngestionWorkflowsUpdate,
  permissions,
}: IngestionProps) => {
  const history = useHistory();
  const { t } = useTranslation();
  const [searchText, setSearchText] = useState('');
  const [showActions, setShowActions] = useState(false);
  const [currTriggerId, setCurrTriggerId] = useState({ id: '', state: '' });
  const [currDeployId, setCurrDeployId] = useState({ id: '', state: '' });
  const [isConfirmationModalOpen, setIsConfirmationModalOpen] = useState(false);
  const [selectedPipeline, setSelectedPipeline] = useState<IngestionPipeline>();
  const [deleteSelection, setDeleteSelection] = useState({
    id: '',
    name: '',
    state: '',
  });
  const [isKillModalOpen, setIsKillModalOpen] = useState<boolean>(false);
  const noConnectionMsg = `${serviceName} doesn't have connection details filled in. Please add the details before scheduling an ingestion job.`;

  const handleSearchAction = (searchValue: string) => {
    setSearchText(searchValue);
  };

  const getSupportedPipelineTypes = () => {
    let pipelineType = [];
    const config = serviceDetails.connection?.config as Connection;
    if (config) {
      config.supportsMetadataExtraction &&
        pipelineType.push(PipelineType.Metadata);
      config.supportsUsageExtraction && pipelineType.push(PipelineType.Usage);
      config.supportsUsageExtraction && pipelineType.push(PipelineType.Lineage);
      config.supportsProfiler && pipelineType.push(PipelineType.Profiler);
    } else {
      pipelineType = [
        PipelineType.Metadata,
        PipelineType.Usage,
        PipelineType.Lineage,
        PipelineType.Profiler,
      ];
    }

    return pipelineType;
  };

  const getIngestionPipelineTypeOption = (): PipelineType[] => {
    const pipelineType = getSupportedPipelineTypes();
    if (ingestionList.length > 0) {
      return pipelineType.reduce((prev, curr) => {
        if (
          // Prevent adding multiple usage pipeline
          curr === PipelineType.Usage &&
          ingestionList.find((d) => d.pipelineType === curr)
        ) {
          return prev;
        } else {
          return [...prev, curr];
        }
      }, [] as PipelineType[]);
    }

    return [
      PipelineType.Metadata,
      PipelineType.Usage,
      PipelineType.Lineage,
      PipelineType.Profiler,
    ];
  };

  const handleTriggerIngestion = (id: string, displayName: string) => {
    setCurrTriggerId({ id, state: 'waiting' });
    triggerIngestion(id, displayName)
      .then(() => {
        setCurrTriggerId({ id, state: 'success' });
        setTimeout(() => {
          setCurrTriggerId({ id: '', state: '' });
          showSuccessToast('Pipeline triggered successfully');
        }, 1500);
      })
      .catch(() => setCurrTriggerId({ id: '', state: '' }));
  };

  const handleDeployIngestion = (id: string) => {
    setCurrDeployId({ id, state: 'waiting' });
    deployIngestion(id)
      .then(() => {
        setCurrDeployId({ id, state: 'success' });
        setTimeout(() => setCurrDeployId({ id: '', state: '' }), 1500);
      })
      .catch(() => setCurrDeployId({ id: '', state: '' }));
  };

  const handleCancelConfirmationModal = () => {
    setIsConfirmationModalOpen(false);
    setDeleteSelection({
      id: '',
      name: '',
      state: '',
    });
  };

  const handleUpdate = (ingestion: IngestionPipeline) => {
    history.push(
      getEditIngestionPath(
        serviceCategory,
        serviceName,
        ingestion.fullyQualifiedName || `${serviceName}.${ingestion.name}`,
        ingestion.pipelineType
      )
    );
  };

  const handleDelete = (id: string, displayName: string) => {
    setDeleteSelection({ id, name: displayName, state: 'waiting' });
    deleteIngestion(id, displayName)
      .then(() => {
        setTimeout(() => {
          setDeleteSelection({ id, name: displayName, state: 'success' });
          handleCancelConfirmationModal();
        }, 500);
      })
      .catch(() => {
        handleCancelConfirmationModal();
      });
  };

  const ConfirmDelete = (id: string, name: string) => {
    setDeleteSelection({
      id,
      name,
      state: '',
    });
    setIsConfirmationModalOpen(true);
  };

  const handleAddIngestionClick = (type?: PipelineType) => {
    setShowActions(false);
    if (type) {
      history.push(getAddIngestionPath(serviceCategory, serviceName, type));
    }
  };

  const getAddIngestionButton = (type: PipelineType) => {
    return (
      <Button
        className={classNames('tw-h-8 tw-rounded tw-mb-2')}
        data-testid="add-new-ingestion-button"
        size="small"
        type="primary"
        onClick={() => handleAddIngestionClick(type)}>
        Add {startCase(type)} Ingestion
      </Button>
    );
  };

  const getAddIngestionDropdown = (types: PipelineType[]) => {
    return (
      <Fragment>
        <Button
          className={classNames('tw-h-8 tw-rounded tw-mb-2')}
          data-testid="add-new-ingestion-button"
          size="small"
          type="primary"
          onClick={() => setShowActions((pre) => !pre)}>
          Add Ingestion{' '}
          {showActions ? (
            <DropdownIcon
              style={{
                transform: 'rotate(180deg)',
                marginTop: '2px',
                color: '#fff',
              }}
            />
          ) : (
            <DropdownIcon
              style={{
                marginTop: '2px',
                color: '#fff',
              }}
            />
          )}
        </Button>
        {showActions && (
          <DropDownList
            horzPosRight
            dropDownList={types.map((type) => ({
              name: `Add ${startCase(type)} Ingestion`,
              value: type,
            }))}
            onSelect={(_e, value) =>
              handleAddIngestionClick(value as PipelineType)
            }
          />
        )}
      </Fragment>
    );
  };

  const getAddIngestionElement = () => {
    const types = getIngestionPipelineTypeOption();
    let element: JSX.Element | null = null;
    // Check if service has atleast one metadata pipeline available or not
    const hasMetadata = ingestionList.find(
      (ingestion) => ingestion.pipelineType === PipelineType.Metadata
    );

    if (types.length) {
      // if service has metedata then show all available option
      if (hasMetadata) {
        element = getAddIngestionDropdown(types);
      } else {
        /**
         * If service does not have any metedata pipeline then
         * show only option for metadata ingestion
         */
        element = getAddIngestionButton(PipelineType.Metadata);
      }
    }

    return element;
  };

  const getSearchedIngestions = useCallback(() => {
    const sText = lowerCase(searchText);

    return sText
      ? ingestionList.filter(
          (ing) =>
            lowerCase(ing.displayName).includes(sText) ||
            lowerCase(ing.name).includes(sText)
        )
      : ingestionList;
  }, [searchText, ingestionList]);

  const separator = (
    <span className="tw-inline-block tw-text-gray-400 tw-self-center">|</span>
  );

  const getStatuses = (ingestion: IngestionPipeline) => {
    const lastFiveIngestions = ingestion.pipelineStatuses
      ?.sort((a, b) => {
        // Turn your strings into millis, and then subtract them
        // to get a value that is either negative, positive, or zero.
        const date1 = new Date(a.startDate || '');
        const date2 = new Date(b.startDate || '');

        return date1.getTime() - date2.getTime();
      })
      .slice(Math.max(ingestion.pipelineStatuses.length - 5, 0));

    return lastFiveIngestions?.map((r, i) => {
      const status =
        i === lastFiveIngestions.length - 1 ? (
          <p
            className={`tw-h-5 tw-w-16 tw-rounded-sm tw-bg-status-${r.pipelineState} tw-mr-1 tw-px-1 tw-text-white tw-text-center`}
            key={i}>
            {capitalize(r.pipelineState)}
          </p>
        ) : (
          <p
            className={`tw-w-4 tw-h-5 tw-rounded-sm tw-bg-status-${r.pipelineState} tw-mr-1`}
            key={i}
          />
        );

      return r?.endDate || r?.startDate || r?.timestamp ? (
        <PopOver
          html={
            <div className="tw-text-left">
              {r.timestamp ? (
                <p>
                  {t('label.execution-date')} :{' '}
                  {new Date(r.timestamp).toUTCString()}
                </p>
              ) : null}
              {r.startDate ? (
                <p>
                  {t('label.start-date')}: {new Date(r.startDate).toUTCString()}
                </p>
              ) : null}
              {r.endDate ? (
                <p>
                  {t('label.end-date')} : {new Date(r.endDate).toUTCString()}
                </p>
              ) : null}
            </div>
          }
          key={i}
          position="bottom"
          theme="light"
          trigger="mouseenter">
          {status}
        </PopOver>
      ) : (
        status
      );
    });
  };

  const getTriggerDeployButton = (ingestion: IngestionPipeline) => {
    if (ingestion.deployed) {
      return (
        <>
          <Button
            data-testid="run"
            type="link"
            onClick={() =>
              handleTriggerIngestion(ingestion.id as string, ingestion.name)
            }>
            {getLoadingStatus(currTriggerId, ingestion.id, t('label.run'))}
          </Button>
          {separator}

          <Button
            data-testid="re-deploy-btn"
            disabled={!isRequiredDetailsAvailable}
            type="link"
            onClick={() => handleDeployIngestion(ingestion.id as string)}>
            {getLoadingStatus(currDeployId, ingestion.id, t('label.re-deploy'))}
          </Button>
        </>
      );
    } else {
      return (
        <Button
          data-testid="deploy"
          type="link"
          onClick={() => handleDeployIngestion(ingestion.id as string)}>
          {getLoadingStatus(currDeployId, ingestion.id, t('label.deploy'))}
        </Button>
      );
    }
  };

  const getIngestionTab = () => {
    return (
      <div
        className="tw-px-4 tw-mt-4"
        data-testid="ingestion-details-container">
        <div className="tw-flex">
          {!isRequiredDetailsAvailable && (
            <div className="tw-rounded tw-bg-error-lite tw-text-error tw-font-medium tw-px-4 tw-py-1 tw-mb-4 tw-flex tw-items-center tw-gap-1">
              <FontAwesomeIcon icon={faExclamationCircle} />
              <p> {noConnectionMsg} </p>
            </div>
          )}
        </div>
        <div className="tw-flex tw-justify-between">
          <div className="tw-w-4/12">
            {searchText || getSearchedIngestions().length > 0 ? (
              <Searchbar
                placeholder="Search for ingestion..."
                searchValue={searchText}
                typingInterval={500}
                onSearch={handleSearchAction}
              />
            ) : null}
          </div>
          <div className="tw-relative">
            {isRequiredDetailsAvailable &&
              permissions.EditAll &&
              getAddIngestionElement()}
          </div>
        </div>
        {getSearchedIngestions().length ? (
          <div className="tw-table-responsive tw-mb-6 tw-table-container">
            <table
              className="tw-bg-white tw-w-full tw-mb-4"
              data-testid="ingestion-table">
              <thead>
                <tr className="tableHead-row" data-testid="table-header">
                  <th className="tableHead-cell">{t('label.name')} </th>
                  <th className="tableHead-cell">{t('label.type')}</th>
                  <th className="tableHead-cell">{t('label.schedule')}</th>
                  <th className="tableHead-cell">{t('label.recent-runs')}</th>
                  <th className="tableHead-cell">{t('label.actions')}</th>
                </tr>
              </thead>
              <tbody className="tableBody">
                {getSearchedIngestions().map((ingestion, index) => (
                  <tr
                    className={classNames(
                      'tableBody-row',
                      !isEven(index + 1) ? 'odd-row' : null
                    )}
                    key={index}>
                    <td className="tableBody-cell">
                      {airflowEndpoint ? (
                        <Tooltip
                          title={
                            permissions.ViewAll || permissions.ViewBasic
                              ? t('label.view-dag')
                              : NO_PERMISSION_TO_VIEW
                          }>
                          <Button
                            className="tw-mr-2"
                            data-testid="airflow-tree-view"
                            disabled={
                              !(permissions.ViewAll || permissions.ViewBasic)
                            }
                            href={`${airflowEndpoint}/tree?dag_id=${ingestion.name}`}
                            rel="noopener noreferrer"
                            target="_blank"
                            type="link">
                            {ingestion.name}
                            <SVGIcons
                              alt="external-link"
                              className="tw-align-middle tw-ml-1"
                              icon={Icons.EXTERNAL_LINK}
                              width="16px"
                            />
                          </Button>
                        </Tooltip>
                      ) : (
                        ingestion.name
                      )}
                    </td>
                    <td className="tableBody-cell">{ingestion.pipelineType}</td>
                    <td className="tableBody-cell">
                      {ingestion.airflowConfig?.scheduleInterval ? (
                        <PopOver
                          html={
                            <div>
                              {cronstrue.toString(
                                ingestion.airflowConfig.scheduleInterval || '',
                                {
                                  use24HourTimeFormat: true,
                                  verbose: true,
                                }
                              )}
                            </div>
                          }
                          position="bottom"
                          theme="light"
                          trigger="mouseenter">
                          <span>
                            {ingestion.airflowConfig.scheduleInterval ?? '--'}
                          </span>
                        </PopOver>
                      ) : (
                        <span>--</span>
                      )}
                    </td>
                    <td className="tableBody-cell">
                      <div className="tw-flex">{getStatuses(ingestion)}</div>
                    </td>
                    <td className="tableBody-cell">
                      <div className="tw-flex">
                        {ingestion.enabled ? (
                          <Fragment>
                            {getTriggerDeployButton(ingestion)}
                            {separator}
                            <Button
                              data-testid="pause"
                              disabled={!isRequiredDetailsAvailable}
                              type="link"
                              onClick={() =>
                                handleEnableDisableIngestion(ingestion.id || '')
                              }>
                              {t('label.pause')}
                            </Button>
                          </Fragment>
                        ) : (
                          <Button
                            data-testid="unpause"
                            disabled={!isRequiredDetailsAvailable}
                            type="link"
                            onClick={() =>
                              handleEnableDisableIngestion(ingestion.id || '')
                            }>
                            {t('label.unpause')}
                          </Button>
                        )}
                        {separator}
                        <Button
                          data-testid="edit"
                          disabled={!isRequiredDetailsAvailable}
                          type="link"
                          onClick={() => handleUpdate(ingestion)}>
                          {t('label.edit')}
                        </Button>
                        {separator}
                        <Button
                          data-testid="delete"
                          type="link"
                          onClick={() =>
                            ConfirmDelete(
                              ingestion.id as string,
                              ingestion.name
                            )
                          }>
                          {deleteSelection.id === ingestion.id ? (
                            deleteSelection.state === 'success' ? (
                              <FontAwesomeIcon icon="check" />
                            ) : (
                              <Loader size="small" type="default" />
                            )
                          ) : (
                            t('label.delete')
                          )}
                        </Button>
                        {separator}
                        <Button
                          data-testid="kill"
                          disabled={!isRequiredDetailsAvailable}
                          type="link"
                          onClick={() => {
                            setIsKillModalOpen(true);
                            setSelectedPipeline(ingestion);
                          }}>
                          {t('label.kill')}
                        </Button>
                        {separator}
                        <Button
                          data-testid="logs"
                          disabled={!isRequiredDetailsAvailable}
                          href={getLogsViewerPath(
                            serviceCategory,
                            ingestion.service?.name || '',
                            ingestion?.fullyQualifiedName ||
                              ingestion?.name ||
                              ''
                          )}
                          type="link"
                          onClick={() => {
                            setSelectedPipeline(ingestion);
                          }}>
                          {t('label.logs')}
                        </Button>
                      </div>
                      {isKillModalOpen &&
                        selectedPipeline &&
                        ingestion.id === selectedPipeline?.id && (
                          <KillIngestionModal
                            isModalOpen={isKillModalOpen}
                            pipelinName={selectedPipeline.name}
                            pipelineId={selectedPipeline.id as string}
                            onClose={() => {
                              setIsKillModalOpen(false);
                              setSelectedPipeline(undefined);
                            }}
                            onIngestionWorkflowsUpdate={
                              onIngestionWorkflowsUpdate
                            }
                          />
                        )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {Boolean(!isNil(paging.after) || !isNil(paging.before)) && (
              <NextPrevious
                currentPage={currrentPage}
                pageSize={PAGE_SIZE}
                paging={paging}
                pagingHandler={pagingHandler}
                totalCount={paging.total}
              />
            )}
          </div>
        ) : (
          isRequiredDetailsAvailable &&
          ingestionList.length === 0 && (
            <ErrorPlaceHolder>
              <Typography.Text>
                {t('label.no-ingestion-available')}
              </Typography.Text>
              <Typography.Text>
                {t('label.no-ingestion-description')}
              </Typography.Text>
              <Typography.Link href={WORKFLOWS_METADATA_DOCS} target="_blank">
                {t('label.metadata-ingestion')}
              </Typography.Link>
            </ErrorPlaceHolder>
          )
        )}
      </div>
    );
  };

  return (
    <div data-testid="ingestion-container">
      {getIngestionTab()}

      {isConfirmationModalOpen && (
        <EntityDeleteModal
          entityName={deleteSelection.name}
          entityType="ingestion"
          loadingState={deleteSelection.state}
          onCancel={handleCancelConfirmationModal}
          onConfirm={() =>
            handleDelete(deleteSelection.id, deleteSelection.name)
          }
        />
      )}
    </div>
  );
};

export default Ingestion;
