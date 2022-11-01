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

import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { Popover, Space, Tag, Typography } from 'antd';
import { ColumnsType } from 'antd/lib/table';
import { AxiosError } from 'axios';
import classNames from 'classnames';
import i18n from 'i18next';
import {
  capitalize,
  differenceWith,
  isEmpty,
  isEqual,
  isNil,
  isNull,
  isUndefined,
  uniqueId,
} from 'lodash';
import {
  CurrentState,
  EntityFieldThreadCount,
  ExtraInfo,
  RecentlySearched,
  RecentlySearchedData,
  RecentlyViewed,
  RecentlyViewedData,
} from 'Models';
import React, { FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { reactLocalStorage } from 'reactjs-localstorage';
import AppState from '../AppState';
import { getFeedCount } from '../axiosAPIs/feedsAPI';
import { Button } from '../components/buttons/Button/Button';
import {
  getDayCron,
  getHourCron,
} from '../components/common/CronEditor/CronEditor.constant';
import ErrorPlaceHolder from '../components/common/error-with-placeholder/ErrorPlaceHolder';
import PopOver from '../components/common/popover/PopOver';
import Loader from '../components/Loader/Loader';
import { FQN_SEPARATOR_CHAR } from '../constants/char.constants';
import {
  getTeamAndUserDetailsPath,
  getUserPath,
  imageTypes,
  LOCALSTORAGE_RECENTLY_SEARCHED,
  LOCALSTORAGE_RECENTLY_VIEWED,
  TITLE_FOR_NON_OWNER_ACTION,
} from '../constants/constants';
import {
  UrlEntityCharRegEx,
  validEmailRegEx,
} from '../constants/regex.constants';
import { SIZE } from '../enums/common.enum';
import { EntityType, FqnPart, TabSpecificField } from '../enums/entity.enum';
import { Ownership } from '../enums/mydata.enum';
import { Bot } from '../generated/entity/bot';
import { Dashboard } from '../generated/entity/data/dashboard';
import { Database } from '../generated/entity/data/database';
import { GlossaryTerm } from '../generated/entity/data/glossaryTerm';
import { Pipeline } from '../generated/entity/data/pipeline';
import { Table } from '../generated/entity/data/table';
import { Topic } from '../generated/entity/data/topic';
import { Webhook } from '../generated/entity/events/webhook';
import { ThreadTaskStatus, ThreadType } from '../generated/entity/feed/thread';
import { Policy } from '../generated/entity/policies/policy';
import {
  IngestionPipeline,
  PipelineType,
} from '../generated/entity/services/ingestionPipelines/ingestionPipeline';
import { Role } from '../generated/entity/teams/role';
import { Team } from '../generated/entity/teams/team';
import { EntityReference, User } from '../generated/entity/teams/user';
import { Paging } from '../generated/type/paging';
import { ServicesType } from '../interface/service.interface';
import jsonData from '../jsons/en';
import { getEntityFeedLink, getTitleCase } from './EntityUtils';
import Fqn from './Fqn';
import { LIST_CAP } from './PermissionsUtils';
import { getRoleWithFqnPath, getTeamsWithFqnPath } from './RouterUtils';
import { serviceTypeLogo } from './ServiceUtils';
import SVGIcons, { Icons } from './SvgUtils';
import { TASK_ENTITIES } from './TasksUtils';
import { showErrorToast } from './ToastUtils';

export const arraySorterByKey = (
  key: string,
  sortDescending = false
): Function => {
  const sortOrder = sortDescending ? -1 : 1;

  return (
    elementOne: { [x: string]: number | string },
    elementTwo: { [x: string]: number | string }
  ) => {
    return (
      (elementOne[key] < elementTwo[key]
        ? -1
        : elementOne[key] > elementTwo[key]
        ? 1
        : 0) * sortOrder
    );
  };
};

export const isEven = (value: number): boolean => {
  return value % 2 === 0;
};

export const getPartialNameFromFQN = (
  fqn: string,
  arrTypes: Array<'service' | 'database' | 'table' | 'column'> = [],
  joinSeperator = '/'
): string => {
  const arrFqn = Fqn.split(fqn);
  const arrPartialName = [];
  for (const type of arrTypes) {
    if (type === 'service' && arrFqn.length > 0) {
      arrPartialName.push(arrFqn[0]);
    } else if (type === 'database' && arrFqn.length > 1) {
      arrPartialName.push(arrFqn[1]);
    } else if (type === 'table' && arrFqn.length > 2) {
      arrPartialName.push(arrFqn[2]);
    } else if (type === 'column' && arrFqn.length > 3) {
      arrPartialName.push(arrFqn[3]);
    }
  }

  return arrPartialName.join(joinSeperator);
};

export const getPartialNameFromTableFQN = (
  fqn: string,
  fqnParts: Array<FqnPart> = [],
  joinSeparator = '/'
): string => {
  if (!fqn) {
    return '';
  }
  const splitFqn = Fqn.split(fqn);
  // if nested column is requested, then ignore all the other
  // parts and just return the nested column name
  if (fqnParts.includes(FqnPart.NestedColumn)) {
    // Remove the first 4 parts (service, database, schema, table)

    return splitFqn.slice(4).join(FQN_SEPARATOR_CHAR);
  }
  const arrPartialName = [];
  if (splitFqn.length > 0) {
    if (fqnParts.includes(FqnPart.Service)) {
      arrPartialName.push(splitFqn[0]);
    }
    if (fqnParts.includes(FqnPart.Database) && splitFqn.length > 1) {
      arrPartialName.push(splitFqn[1]);
    }
    if (fqnParts.includes(FqnPart.Schema) && splitFqn.length > 2) {
      arrPartialName.push(splitFqn[2]);
    }
    if (fqnParts.includes(FqnPart.Table) && splitFqn.length > 3) {
      arrPartialName.push(splitFqn[3]);
    }
    if (fqnParts.includes(FqnPart.Column) && splitFqn.length > 4) {
      arrPartialName.push(splitFqn[4]);
    }
  }

  return arrPartialName.join(joinSeparator);
};

export const getTableFQNFromColumnFQN = (columnFQN: string): string => {
  return getPartialNameFromTableFQN(
    columnFQN,
    [FqnPart.Service, FqnPart.Database, FqnPart.Schema, FqnPart.Table],
    '.'
  );
};

export const getCurrentUserId = (): string => {
  const currentUser = AppState.getCurrentUserDetails();

  return currentUser?.id || '';
};

export const pluralize = (count: number, noun: string, suffix = 's') => {
  const countString = count.toLocaleString();
  if (count !== 1 && count !== 0 && !noun.endsWith(suffix)) {
    return `${countString} ${noun}${suffix}`;
  } else {
    if (noun.endsWith(suffix)) {
      return `${countString} ${
        count > 1 ? noun : noun.slice(0, noun.length - 1)
      }`;
    } else {
      return `${countString} ${noun}${count > 1 ? suffix : ''}`;
    }
  }
};

export const hasEditAccess = (type: string, id: string) => {
  const loggedInUser = AppState.getCurrentUserDetails();
  if (type === 'user') {
    return id === loggedInUser?.id;
  } else {
    return Boolean(
      loggedInUser?.teams?.length &&
        loggedInUser?.teams?.some((team) => team.id === id)
    );
  }
};

export const getTabClasses = (
  tab: number | string,
  activeTab: number | string
) => {
  return 'tw-gh-tabs' + (activeTab === tab ? ' active' : '');
};

export const getCountBadge = (
  count = 0,
  className = '',
  isActive?: boolean
) => {
  const clsBG = isUndefined(isActive)
    ? ''
    : isActive
    ? 'tw-bg-primary tw-text-white tw-border-none'
    : 'tw-bg-badge';

  return (
    <span
      className={classNames(
        'tw-py-px tw-px-1 tw-mx-1 tw-border tw-rounded tw-text-xs tw-min-w-badgeCount tw-text-center',
        clsBG,
        className
      )}>
      <span data-testid="filter-count" title={count.toString()}>
        {count}
      </span>
    </span>
  );
};

export const getRecentlyViewedData = (): Array<RecentlyViewedData> => {
  const recentlyViewed: RecentlyViewed = reactLocalStorage.getObject(
    LOCALSTORAGE_RECENTLY_VIEWED
  ) as RecentlyViewed;

  if (recentlyViewed?.data) {
    return recentlyViewed.data;
  }

  return [];
};

export const getRecentlySearchedData = (): Array<RecentlySearchedData> => {
  const recentlySearch: RecentlySearched = reactLocalStorage.getObject(
    LOCALSTORAGE_RECENTLY_SEARCHED
  ) as RecentlySearched;
  if (recentlySearch?.data) {
    return recentlySearch.data;
  }

  return [];
};

export const setRecentlyViewedData = (
  recentData: Array<RecentlyViewedData>
): void => {
  reactLocalStorage.setObject(LOCALSTORAGE_RECENTLY_VIEWED, {
    data: recentData,
  });
};

export const setRecentlySearchedData = (
  recentData: Array<RecentlySearchedData>
): void => {
  reactLocalStorage.setObject(LOCALSTORAGE_RECENTLY_SEARCHED, {
    data: recentData,
  });
};

export const addToRecentSearched = (searchTerm: string): void => {
  if (searchTerm.trim()) {
    const searchData = { term: searchTerm, timestamp: Date.now() };
    const recentlySearch: RecentlySearched = reactLocalStorage.getObject(
      LOCALSTORAGE_RECENTLY_SEARCHED
    ) as RecentlySearched;
    let arrSearchedData: RecentlySearched['data'] = [];
    if (recentlySearch?.data) {
      const arrData = recentlySearch.data
        // search term is not case-insensetive.
        .filter((item) => item.term !== searchData.term)
        .sort(
          arraySorterByKey('timestamp', true) as (
            a: RecentlySearchedData,
            b: RecentlySearchedData
          ) => number
        );
      arrData.unshift(searchData);

      if (arrData.length > 5) {
        arrData.pop();
      }
      arrSearchedData = arrData;
    } else {
      arrSearchedData = [searchData];
    }
    setRecentlySearchedData(arrSearchedData);
  }
};

export const removeRecentSearchTerm = (searchTerm: string) => {
  const recentlySearch: RecentlySearched = reactLocalStorage.getObject(
    LOCALSTORAGE_RECENTLY_SEARCHED
  ) as RecentlySearched;
  if (recentlySearch?.data) {
    const arrData = recentlySearch.data.filter(
      (item) => item.term !== searchTerm
    );
    setRecentlySearchedData(arrData);
  }
};

export const addToRecentViewed = (eData: RecentlyViewedData): void => {
  const entityData = { ...eData, timestamp: Date.now() };
  let recentlyViewed: RecentlyViewed = reactLocalStorage.getObject(
    LOCALSTORAGE_RECENTLY_VIEWED
  ) as RecentlyViewed;
  if (recentlyViewed?.data) {
    const arrData = recentlyViewed.data
      .filter((item) => item.fqn !== entityData.fqn)
      .sort(
        arraySorterByKey('timestamp', true) as (
          a: RecentlyViewedData,
          b: RecentlyViewedData
        ) => number
      );
    arrData.unshift(entityData);

    if (arrData.length > 5) {
      arrData.pop();
    }
    recentlyViewed.data = arrData;
  } else {
    recentlyViewed = {
      data: [entityData],
    };
  }
  setRecentlyViewedData(recentlyViewed.data);
};

export const getHtmlForNonAdminAction = (isClaimOwner: boolean) => {
  return (
    <>
      <p>{TITLE_FOR_NON_OWNER_ACTION}</p>
      {!isClaimOwner ? <p>Claim ownership in Manage </p> : null}
    </>
  );
};

export const getOwnerIds = (
  filter: Ownership,
  userDetails: User,
  nonSecureUserDetails: User
): Array<string> => {
  if (filter === Ownership.OWNER) {
    if (!isEmpty(userDetails)) {
      return [
        ...(userDetails.teams?.map((team) => team.id) || []),
        userDetails.id,
      ];
    } else {
      if (!isEmpty(nonSecureUserDetails)) {
        return [
          ...(nonSecureUserDetails.teams?.map((team) => team.id) || []),
          nonSecureUserDetails.id,
        ];
      } else {
        return [];
      }
    }
  } else {
    return [userDetails.id || nonSecureUserDetails.id];
  }
};

export const getActiveCatClass = (name: string, activeName = '') => {
  return activeName === name ? 'activeCategory' : '';
};

export const errorMsg = (value: string) => {
  return (
    <div className="tw-mt-1">
      <strong
        className="tw-text-red-500 tw-text-xs tw-italic"
        data-testid="error-message">
        {value}
      </strong>
    </div>
  );
};

export const validMsg = (value: string) => {
  return (
    <div className="tw-mt-1">
      <strong
        className="tw-text-success tw-text-xs tw-italic"
        data-testid="error-message">
        {value}
      </strong>
    </div>
  );
};

export const requiredField = (label: string, excludeSpace = false) => (
  <>
    {label}{' '}
    <span className="tw-text-red-500">{!excludeSpace && <>&nbsp;</>}*</span>
  </>
);

export const getSeparator = (
  title: string | JSX.Element,
  hrMarginTop = 'tw-mt-2.5'
) => {
  return (
    <span className="tw-flex tw-py-2 tw-text-grey-muted">
      <hr className={classNames('tw-w-full', hrMarginTop)} />
      {title && <span className="tw-px-0.5 tw-min-w-max">{title}</span>}
      <hr className={classNames('tw-w-full', hrMarginTop)} />
    </span>
  );
};

export const getImages = (imageUri: string) => {
  const imagesObj: typeof imageTypes = imageTypes;
  for (const type in imageTypes) {
    imagesObj[type as keyof typeof imageTypes] = imageUri.replace(
      's96-c',
      imageTypes[type as keyof typeof imageTypes]
    );
  }

  return imagesObj;
};

export const getServiceLogo = (
  serviceType: string,
  className = ''
): JSX.Element | null => {
  const logo = serviceTypeLogo(serviceType);

  if (!isNull(logo)) {
    return <img alt="" className={className} src={logo} />;
  }

  return null;
};

export const getSvgArrow = (isActive: boolean) => {
  return isActive ? (
    <SVGIcons alt="arrow-down" icon={Icons.ARROW_DOWN_PRIMARY} />
  ) : (
    <SVGIcons alt="arrow-right" icon={Icons.ARROW_RIGHT_PRIMARY} />
  );
};

export const isValidUrl = (href?: string) => {
  if (!href) {
    return false;
  }
  try {
    const url = new URL(href);

    return Boolean(url.href);
  } catch {
    return false;
  }
};

/**
 *
 * @param email - email address string
 * @returns - True|False
 */
export const isValidEmail = (email?: string) => {
  let isValid = false;
  if (email && email.match(validEmailRegEx)) {
    isValid = true;
  }

  return isValid;
};

export const getFields = (defaultFields: string, tabSpecificField: string) => {
  if (!tabSpecificField) {
    return defaultFields;
  }
  if (!defaultFields) {
    return tabSpecificField;
  }
  if (
    tabSpecificField === TabSpecificField.LINEAGE ||
    tabSpecificField === TabSpecificField.ACTIVITY_FEED
  ) {
    return defaultFields;
  }

  return `${defaultFields}, ${tabSpecificField}`;
};

export const restrictFormSubmit = (e: FormEvent) => {
  e.preventDefault();
};

export const getEntityMissingError = (entityType: string, fqn: string) => {
  return (
    <p>
      {capitalize(entityType)} instance for <strong>{fqn}</strong> not found
    </p>
  );
};

export const getDocButton = (label: string, url: string, dataTestId = '') => {
  return (
    <Button
      className="tw-group tw-rounded tw-w-full tw-px-3 tw-py-1.5 tw-text-sm"
      data-testid={dataTestId}
      href={url}
      rel="noopener noreferrer"
      size="custom"
      tag="a"
      target="_blank"
      theme="primary"
      variant="outlined">
      <SVGIcons
        alt="Doc icon"
        className="tw-align-middle tw-mr-2 group-hover:tw-hidden"
        icon={Icons.DOC_PRIMARY}
        width="14"
      />
      <SVGIcons
        alt="Doc icon"
        className="tw-align-middle tw-mr-2 tw-hidden group-hover:tw-inline-block"
        icon={Icons.DOC_WHITE}
        width="14"
      />
      <span>{label}</span>
      <SVGIcons
        alt="external-link"
        className="tw-align-middle tw-ml-2 group-hover:tw-hidden"
        icon={Icons.EXTERNAL_LINK}
        width="14"
      />
      <SVGIcons
        alt="external-link"
        className="tw-align-middle tw-ml-2 tw-hidden group-hover:tw-inline-block"
        icon={Icons.EXTERNAL_LINK_WHITE}
        width="14"
      />
    </Button>
  );
};

export const getNameFromFQN = (fqn: string): string => {
  const arr = fqn.split(FQN_SEPARATOR_CHAR);

  return arr[arr.length - 1];
};

export const getRandomColor = (name: string) => {
  const firstAlphabet = name.charAt(0).toLowerCase();
  const asciiCode = firstAlphabet.charCodeAt(0);
  const colorNum =
    asciiCode.toString() + asciiCode.toString() + asciiCode.toString();

  const num = Math.round(0xffffff * parseInt(colorNum));
  const r = (num >> 16) & 255;
  const g = (num >> 8) & 255;
  const b = num & 255;

  return {
    color: 'rgb(' + r + ', ' + g + ', ' + b + ', 0.6)',
    character: firstAlphabet.toUpperCase(),
  };
};

export const isUrlFriendlyName = (value: string) => {
  return !UrlEntityCharRegEx.test(value);
};

/**
 * Take teams data and filter out the non deleted teams
 * @param teams - teams array
 * @returns - non deleted team
 */
export const getNonDeletedTeams = (teams: EntityReference[]) => {
  return teams.filter((t) => !t.deleted);
};

/**
 * prepare label for given entity type and fqn
 * @param type - entity type
 * @param fqn - entity fqn
 * @param withQuotes - boolean value
 * @returns - label for entity
 */
export const prepareLabel = (type: string, fqn: string, withQuotes = true) => {
  let label = '';
  if (type === EntityType.TABLE) {
    label = getPartialNameFromTableFQN(fqn, [FqnPart.Table]);
  } else {
    label = getPartialNameFromFQN(fqn, ['database']);
  }

  if (withQuotes) {
    return label;
  } else {
    return label.replace(/(^"|"$)/g, '');
  }
};

/**
 * Check if entity is deleted and return with "(Deactivated) text"
 * @param value - entity name
 * @param isDeleted - boolean
 * @returns - entity placeholder
 */
export const getEntityPlaceHolder = (value: string, isDeleted?: boolean) => {
  if (isDeleted) {
    return `${value} (Deactivated)`;
  } else {
    return value;
  }
};

/**
 * Take entity reference as input and return name for entity
 * @param entity - entity reference
 * @returns - entity name
 */
export const getEntityName = (
  entity?:
    | EntityReference
    | ServicesType
    | User
    | Topic
    | Database
    | Dashboard
    | Table
    | Pipeline
    | Team
    | Policy
    | Role
    | GlossaryTerm
    | Webhook
    | Bot
) => {
  return entity?.displayName || entity?.name || '';
};

export const getEntityId = (
  entity?:
    | EntityReference
    | ServicesType
    | User
    | Topic
    | Database
    | Dashboard
    | Table
    | Pipeline
    | Team
    | Policy
    | Role
) => entity?.id || '';

export const getEntityDeleteMessage = (entity: string, dependents: string) => {
  if (dependents) {
    return `Permanently deleting this ${getTitleCase(
      entity
    )} will remove its metadata, as well as the metadata of ${dependents} from OpenMetadata permanently.`;
  } else {
    return `Permanently deleting this ${getTitleCase(
      entity
    )} will remove its metadata from OpenMetadata permanently.`;
  }
};

export const replaceSpaceWith_ = (text: string) => {
  return text.replace(/\s/g, '_');
};

export const replaceAllSpacialCharWith_ = (text: string) => {
  return text.replaceAll(/[&/\\#, +()$~%.'":*?<>{}]/g, '_');
};

export const getFeedCounts = (
  entityType: string,
  entityFQN: string,
  conversationCallback: (
    value: React.SetStateAction<EntityFieldThreadCount[]>
  ) => void,
  taskCallback: (value: React.SetStateAction<EntityFieldThreadCount[]>) => void,
  entityCallback: (value: React.SetStateAction<number>) => void
) => {
  // To get conversation count
  getFeedCount(
    getEntityFeedLink(entityType, entityFQN),
    ThreadType.Conversation
  )
    .then((res) => {
      if (res) {
        conversationCallback(res.counts);
      } else {
        throw jsonData['api-error-messages']['fetch-entity-feed-count-error'];
      }
    })
    .catch((err: AxiosError) => {
      showErrorToast(
        err,
        jsonData['api-error-messages']['fetch-entity-feed-count-error']
      );
    });

  // To get open tasks count
  getFeedCount(
    getEntityFeedLink(entityType, entityFQN),
    ThreadType.Task,
    ThreadTaskStatus.Open
  )
    .then((res) => {
      if (res) {
        taskCallback(res.counts);
      } else {
        throw jsonData['api-error-messages']['fetch-entity-feed-count-error'];
      }
    })
    .catch((err: AxiosError) => {
      showErrorToast(
        err,
        jsonData['api-error-messages']['fetch-entity-feed-count-error']
      );
    });

  // To get all thread count (task + conversation)
  getFeedCount(getEntityFeedLink(entityType, entityFQN))
    .then((res) => {
      if (res) {
        entityCallback(res.totalCount);
      } else {
        throw jsonData['api-error-messages']['fetch-entity-feed-count-error'];
      }
    })
    .catch((err: AxiosError) => {
      showErrorToast(
        err,
        jsonData['api-error-messages']['fetch-entity-feed-count-error']
      );
    });
};

/**
 *
 * @param entityType type of the entity
 * @returns true if entity type exists in TASK_ENTITIES otherwise false
 */
export const isTaskSupported = (entityType: EntityType) =>
  TASK_ENTITIES.includes(entityType);

/**
 * Utility function to show pagination
 * @param paging paging object
 * @returns boolean
 */
export const showPagination = (paging: Paging) => {
  return !isNil(paging.after) || !isNil(paging.before);
};

export const formatNumberWithComma = (number: number) => {
  return new Intl.NumberFormat('en-US', { maximumSignificantDigits: 3 }).format(
    number
  );
};

export const formTwoDigitNmber = (number: number) => {
  return number.toLocaleString('en-US', {
    minimumIntegerDigits: 2,
    useGrouping: false,
  });
};

export const getTeamsUser = (
  data?: ExtraInfo
): Record<string, string | undefined> | undefined => {
  if (!isUndefined(data) && !isEmpty(data?.placeholderText || data?.id)) {
    const currentUser = AppState.getCurrentUserDetails();
    const teams = currentUser?.teams;

    const dataFound = teams?.find((team) => {
      return data.id === team.id;
    });

    if (dataFound) {
      return {
        ownerName: (currentUser?.displayName || currentUser?.name) as string,
        id: currentUser?.id as string,
      };
    }
  }

  return;
};

export const getIngestionStatuses = (ingestion: IngestionPipeline) => {
  const lastFiveIngestions = ingestion.pipelineStatuses;
  // ?.sort((a, b) => {
  //   // Turn your strings into millis, and then subtract them
  //   // to get a value that is either negative, positive, or zero.
  //   const date1 = new Date(a.startDate || '');
  //   const date2 = new Date(b.startDate || '');

  //   return date1.getTime() - date2.getTime();
  // })
  // .slice(Math.max(ingestion.pipelineStatuses.length - 5, 0));

  return [lastFiveIngestions]?.map((r, i) => {
    const status = (
      <p
        className={`tw-h-5 tw-w-16 tw-rounded-sm tw-bg-status-${r?.pipelineState} tw-mr-1 tw-px-1 tw-text-white tw-text-center`}
        key={i}>
        {capitalize(r?.pipelineState)}
      </p>
    );
    //   : (
    //     <p
    //       className={`tw-w-4 tw-h-5 tw-rounded-sm tw-bg-status-${r.state} tw-mr-1`}
    //       key={i}
    //     />
    //   );

    return r?.endDate || r?.startDate || r?.timestamp ? (
      <PopOver
        html={
          <div className="tw-text-left">
            {r.timestamp ? (
              <p>Execution Date: {new Date(r.timestamp).toUTCString()}</p>
            ) : null}
            {r.startDate ? (
              <p>Start Date: {new Date(r.startDate).toUTCString()}</p>
            ) : null}
            {r.endDate ? (
              <p>End Date: {new Date(r.endDate).toUTCString()}</p>
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

export const getDiffArray = (
  compareWith: string[],
  toCompare: string[]
): string[] => {
  return differenceWith(compareWith, toCompare, isEqual);
};

export const getHostNameFromURL = (url: string) => {
  if (isValidUrl(url)) {
    const domain = new URL(url);

    return domain.hostname;
  } else {
    return '';
  }
};

export const commonUserDetailColumns: ColumnsType<User> = [
  {
    title: 'Username',
    dataIndex: 'username',
    key: 'username',
    render: (_, record) => (
      <Link
        className="hover:tw-underline tw-cursor-pointer"
        to={getUserPath(record.fullyQualifiedName || record.name)}>
        {getEntityName(record)}
      </Link>
    ),
  },
  {
    title: 'Teams',
    dataIndex: 'teams',
    key: 'teams',
    render: (_, record) => {
      const listLength = record.teams?.length ?? 0;
      const hasMore = listLength > LIST_CAP;

      if (isUndefined(record.teams) || isEmpty(record.teams)) {
        return <>No Team</>;
      } else {
        return (
          <Space wrap data-testid="policy-link" size={4}>
            {record.teams.slice(0, LIST_CAP).map((team) => (
              <Link
                className="hover:tw-underline tw-cursor-pointer"
                key={uniqueId()}
                to={getTeamsWithFqnPath(team.fullyQualifiedName ?? '')}>
                {getEntityName(team)}
              </Link>
            ))}
            {hasMore && (
              <Popover
                className="tw-cursor-pointer"
                content={
                  <Space wrap size={4}>
                    {record.teams.slice(LIST_CAP).map((team) => (
                      <Link
                        className="hover:tw-underline tw-cursor-pointer"
                        key={uniqueId()}
                        to={getTeamsWithFqnPath(team.fullyQualifiedName ?? '')}>
                        {getEntityName(team)}
                      </Link>
                    ))}
                  </Space>
                }
                overlayClassName="tw-w-40 tw-text-center"
                trigger="click">
                <Tag className="tw-ml-1" data-testid="plus-more-count">{`+${
                  listLength - LIST_CAP
                } more`}</Tag>
              </Popover>
            )}
          </Space>
        );
      }
    },
  },
  {
    title: 'Roles',
    dataIndex: 'roles',
    key: 'roles',
    render: (_, record) => {
      const listLength = record.roles?.length ?? 0;
      const hasMore = listLength > LIST_CAP;

      if (isUndefined(record.roles) || isEmpty(record.roles)) {
        return <>No Role</>;
      } else {
        return (
          <Space wrap data-testid="policy-link" size={4}>
            {record.roles.slice(0, LIST_CAP).map((role) => (
              <Link
                className="hover:tw-underline tw-cursor-pointer"
                key={uniqueId()}
                to={getRoleWithFqnPath(role.fullyQualifiedName ?? '')}>
                {getEntityName(role)}
              </Link>
            ))}
            {hasMore && (
              <Popover
                className="tw-cursor-pointer"
                content={
                  <Space wrap size={4}>
                    {record.roles.slice(LIST_CAP).map((role) => (
                      <Link
                        className="hover:tw-underline tw-cursor-pointer"
                        key={uniqueId()}
                        to={getRoleWithFqnPath(role.fullyQualifiedName ?? '')}>
                        {getEntityName(role)}
                      </Link>
                    ))}
                  </Space>
                }
                overlayClassName="tw-w-40 tw-text-center"
                trigger="click">
                <Tag className="tw-ml-1" data-testid="plus-more-count">{`+${
                  listLength - LIST_CAP
                } more`}</Tag>
              </Popover>
            )}
          </Space>
        );
      }
    },
  },
];

export const getOwnerValue = (owner: EntityReference) => {
  switch (owner?.type) {
    case 'team':
      return getTeamAndUserDetailsPath(owner?.name || '');
    case 'user':
      return getUserPath(owner?.fullyQualifiedName ?? '');
    default:
      return '';
  }
};

export const getIngestionFrequency = (pipelineType: PipelineType) => {
  const value = {
    min: 0,
    hour: 0,
  };

  switch (pipelineType) {
    case PipelineType.TestSuite:
    case PipelineType.Metadata:
      return getHourCron(value);

    default:
      return getDayCron(value);
  }
};

export const getEmptyPlaceholder = () => {
  return (
    <ErrorPlaceHolder size={SIZE.MEDIUM}>
      <Typography.Paragraph>
        {i18n.t('label.no-data-available')}
      </Typography.Paragraph>
    </ErrorPlaceHolder>
  );
};

//  return the status like loading and success
export const getLoadingStatus = (
  current: CurrentState,
  id: string | undefined,
  displayText: string
) => {
  return current.id === id ? (
    current.state === 'success' ? (
      <FontAwesomeIcon icon="check" />
    ) : (
      <Loader size="small" type="default" />
    )
  ) : (
    displayText
  );
};
